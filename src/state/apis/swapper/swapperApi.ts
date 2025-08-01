import { createApi } from '@reduxjs/toolkit/query/react'
import { solAssetId } from '@shapeshiftoss/caip'
import type { GetTradeRateInput, SwapperDeps, ThorEvmTradeQuote } from '@shapeshiftoss/swapper'
import {
  getChainIdBySwapper,
  getTradeQuotes,
  getTradeRates,
  SwapperName,
  TradeType,
} from '@shapeshiftoss/swapper'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { validateTradeQuote } from './helpers/validateTradeQuote'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { assertGetChainAdapter } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { thorchainBlockTimeMs } from '@/lib/utils/thorchain/constants'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { getInboundAddressesQuery, getMimirQuery } from '@/react-queries/queries/thornode'
import { selectInboundAddressData, selectIsTradingActive } from '@/react-queries/selectors'
import { getInputOutputRatioFromQuote } from '@/state/apis/swapper/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote, TradeQuoteOrRateRequest } from '@/state/apis/swapper/types'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
import { getEnabledSwappers } from '@/state/helpers'
import type { ReduxState } from '@/state/reducer'
import { selectAssets } from '@/state/slices/assetsSlice/selectors'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import type { FeatureFlags } from '@/state/slices/preferencesSlice/preferencesSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['TradeQuote'],
  endpoints: build => ({
    getTradeQuote: build.query<Record<string, ApiQuote>, TradeQuoteOrRateRequest>({
      queryFn: async (tradeQuoteInput: TradeQuoteOrRateRequest, { dispatch, getState }) => {
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

        const isSolBuyAssetId = buyAsset.assetId === solAssetId
        const isCrossAccountTrade =
          Boolean(sendAddress && receiveAddress) &&
          sendAddress?.toLowerCase() !== receiveAddress?.toLowerCase()
        const featureFlags: FeatureFlags = preferences.selectors.selectFeatureFlags(state)
        const isSwapperEnabled = getEnabledSwappers(
          featureFlags,
          isCrossAccountTrade,
          isSolBuyAssetId,
        )[swapperName]

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
          mixPanel: getMixPanel(),
        }

        const getQuoteResult = () => {
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
                  // We only need to fetch inbound_address and mimir for THORChain and MAYAChain - this avoids overfetching for other swappers
                  if (![SwapperName.Thorchain, SwapperName.Mayachain].includes(swapperName))
                    return true

                  const chainId = getChainIdBySwapper(swapperName)

                  const inboundAddresses = await queryClient.fetchQuery({
                    ...getInboundAddressesQuery(chainId),
                    // Go stale instantly
                    staleTime: 0,
                    // Never store queries in cache since we always want fresh data
                    gcTime: 0,
                  })

                  const inboundAddressResponse = selectInboundAddressData(inboundAddresses, assetId)

                  const mimir = await queryClient.fetchQuery({
                    ...getMimirQuery(chainId),
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
  }),
})

export const { useGetTradeQuoteQuery } = swapperApi
