import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { GetTradeRateInput, SwapperConfig, SwapperDeps } from '@shapeshiftoss/swapper'
import {
  getSupportedBuyAssetIds,
  getSupportedSellAssetIds,
  getTradeQuotes,
  getTradeRates,
  SwapperName,
} from '@shapeshiftoss/swapper'
import type { ThorEvmTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { TradeType } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/longTailHelpers'
import { getConfig } from 'config'
import { reactQueries } from 'react-queries'
import { selectInboundAddressData, selectIsTradingActive } from 'react-queries/selectors'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { assertGetChainAdapter } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetSolanaChainAdapter } from 'lib/utils/solana'
import { thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { getInputOutputRatioFromQuote } from 'state/apis/swapper/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote, TradeQuoteRequest } from 'state/apis/swapper/types'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'
import { getEnabledSwappers } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { selectInputSellAsset } from 'state/slices/tradeInputSlice/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { validateTradeQuote } from './helpers/validateTradeQuote'

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['TradeQuote'],
  endpoints: build => ({
    getTradeQuote: build.query<Record<string, ApiQuote>, TradeQuoteRequest>({
      queryFn: async (tradeQuoteInput: TradeQuoteRequest, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const {
          swapperName,
          sendAddress,
          receiveAddress,
          sellAsset,
          buyAsset,
          affiliateBps,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          quoteOrRate,
        } = tradeQuoteInput

        const isCrossAccountTrade =
          Boolean(sendAddress && receiveAddress) && sendAddress !== receiveAddress
        const featureFlags: FeatureFlags = selectFeatureFlags(state)
        const isSwapperEnabled = getEnabledSwappers(featureFlags, isCrossAccountTrade)[swapperName]

        if (!isSwapperEnabled) return { data: {} }

        // hydrate crypto market data for buy and sell assets
        await Promise.all([
          dispatch(marketApi.endpoints.findByAssetId.initiate(sellAsset.assetId)),
          dispatch(marketApi.endpoints.findByAssetId.initiate(buyAsset.assetId)),
        ])

        const swapperDeps: SwapperDeps = {
          assetsById: selectAssets(state),
          assertGetChainAdapter,
          assertGetEvmChainAdapter,
          assertGetUtxoChainAdapter,
          assertGetCosmosSdkChainAdapter,
          assertGetSolanaChainAdapter,
          fetchIsSmartContractAddressQuery,
          config: getConfig(),
        }

        const getQuoteResult = () => {
          // Always get a trade rate if quoteOrRate === 'rate', which is passed if the PublicTradeRoute flag is on for the time being
          // this is the sanest way for the time being, since we want to store rates exactly the same as quotes, and fetch a quote instead of a rate at pre-execution time
          // when we wire this up fully. Going further, we may or may not want to change heuristics here.
          if (quoteOrRate === 'rate')
            return getTradeRates(
              {
                ...tradeQuoteInput,
                affiliateBps,
              } as GetTradeRateInput,
              swapperName,
              swapperDeps,
            )

          if (!tradeQuoteInput.receiveAddress)
            throw new Error('Cannot get a trade quote without a receive address')

          return getTradeQuotes(
            {
              ...tradeQuoteInput,
              affiliateBps,
            },
            swapperName,
            swapperDeps,
          )
        }

        const quoteResult = await getQuoteResult()

        if (quoteResult === undefined) {
          return { data: {} }
        }

        const quoteWithInputOutputRatios = (quoteResult => {
          if (quoteResult.isErr()) {
            const error = quoteResult.unwrapErr()
            return [
              {
                quote: undefined,
                error,
                inputOutputRatio: -Infinity,
                swapperName: quoteResult.swapperName,
              },
            ]
          }

          return quoteResult.unwrap().map(quote => {
            const inputOutputRatio = getInputOutputRatioFromQuote({
              // We need to get the freshest state after fetching market data above
              state: getState() as ReduxState,
              quote,
              swapperName: quoteResult.swapperName,
            })
            return {
              quote,
              error: undefined,
              inputOutputRatio,
              swapperName: quoteResult.swapperName,
            }
          })
        })(quoteResult)

        const unorderedQuotes: ApiQuote[] = await Promise.all(
          quoteWithInputOutputRatios.map(async quoteData => {
            const { quote, swapperName, inputOutputRatio, error } = quoteData
            const tradeType = (quote as ThorEvmTradeQuote)?.tradeType

            // use the quote source as the ID so user selection can persist through polling
            const quoteSource = quoteData.quote?.steps[0].source ?? quoteData.swapperName

            const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = await (async () => {
              // allow swapper errors to flow through
              if (error !== undefined) {
                return { isTradingActiveOnSellPool: false, isTradingActiveOnBuyPool: false }
              }

              const [isTradingActiveOnSellPool, isTradingActiveOnBuyPool] = await Promise.all(
                [sellAsset.assetId, buyAsset.assetId].map(async assetId => {
                  // We only need to fetch inbound_address and mimir for THORChain - this avoids overfetching for other swappers
                  if (swapperName !== SwapperName.Thorchain) return true

                  const inboundAddresses = await queryClient.fetchQuery({
                    ...reactQueries.thornode.inboundAddresses(),
                    // Go stale instantly
                    staleTime: 0,
                    // Never store queries in cache since we always want fresh data
                    gcTime: 0,
                  })

                  const inboundAddressResponse = selectInboundAddressData(inboundAddresses, assetId)

                  const mimir = await queryClient.fetchQuery({
                    ...reactQueries.thornode.mimir(),
                    staleTime: thorchainBlockTimeMs,
                  })

                  return selectIsTradingActive({
                    assetId,
                    inboundAddressResponse,
                    swapperName,
                    mimir,
                  })
                }),
              )
              return {
                isTradingActiveOnSellPool:
                  tradeType === TradeType.LongTailToL1 || isTradingActiveOnSellPool,
                isTradingActiveOnBuyPool:
                  tradeType === TradeType.L1ToLongTail || isTradingActiveOnBuyPool,
              }
            })()

            if (isTradingActiveOnSellPool === undefined || isTradingActiveOnBuyPool === undefined) {
              return {
                id: quoteSource,
                quote,
                swapperName,
                inputOutputRatio,
                errors: [{ error: TradeQuoteValidationError.QueryFailed }],
                warnings: [],
                isStale: false,
              }
            }

            const { errors, warnings } = validateTradeQuote(state, {
              swapperName,
              quote,
              error,
              isTradingActiveOnSellPool,
              isTradingActiveOnBuyPool,
              sendAddress,
              inputSellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
              quoteOrRate: tradeQuoteInput.quoteOrRate,
            })
            return {
              id: quoteSource,
              quote,
              swapperName,
              inputOutputRatio,
              errors,
              warnings,
              isStale: false,
            }
          }),
        )

        const tradeQuotesById = unorderedQuotes.reduce(
          (acc, quoteData) => {
            acc[quoteData.id] = quoteData
            return acc
          },
          {} as Record<string, ApiQuote>,
        )

        return { data: tradeQuotesById }
      },
      providesTags: (_result, _error, tradeQuoteRequest) => [
        { type: 'TradeQuote' as const, id: tradeQuoteRequest.swapperName },
      ],
    }),
    getSupportedAssets: build.query<
      {
        supportedSellAssetIds: AssetId[]
        supportedBuyAssetIds: AssetId[]
      },
      { walletSupportedChainIds: ChainId[]; sortedAssetIds: AssetId[] }
    >({
      queryFn: async (
        {
          walletSupportedChainIds,
          sortedAssetIds,
        }: { walletSupportedChainIds: ChainId[]; sortedAssetIds: AssetId[] },
        { getState },
      ) => {
        const state = getState() as ReduxState

        const featureFlags = selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(featureFlags, false)
        const assets = selectAssets(state)
        const sellAsset = selectInputSellAsset(state)
        const swapperConfig: SwapperConfig = getConfig()

        const supportedSellAssetsSet = await getSupportedSellAssetIds(
          enabledSwappers,
          assets,
          swapperConfig,
        )
        const supportedSellAssetIds = sortedAssetIds
          .filter(assetId => supportedSellAssetsSet.has(assetId))
          .filter(assetId => {
            const chainId = fromAssetId(assetId).chainId
            return walletSupportedChainIds.includes(chainId)
          })

        const supportedBuyAssetsSet = await getSupportedBuyAssetIds(
          enabledSwappers,
          sellAsset,
          assets,
          swapperConfig,
        )

        const supportedBuyAssetIds = sortedAssetIds.filter(assetId =>
          supportedBuyAssetsSet.has(assetId),
        )

        return {
          data: {
            supportedSellAssetIds,
            supportedBuyAssetIds,
          },
        }
      },
      providesTags: [],
    }),
  }),
})

export const { useGetTradeQuoteQuery, useGetSupportedAssetsQuery } = swapperApi
