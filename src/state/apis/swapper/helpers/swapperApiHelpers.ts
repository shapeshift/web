import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type {
  QuoteResult,
  RateResult,
  SwapErrorRight,
  SwapperDeps,
  ThorTradeQuote,
  TradeQuote,
  TradeRate,
} from '@shapeshiftoss/swapper'
import { getChainIdBySwapper, SwapperName, TradeType } from '@shapeshiftoss/swapper'
import { bnOrZero, contractAddressOrUndefined } from '@shapeshiftoss/utils'

import { validateTradeQuote } from './validateTradeQuote'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { assertGetChainAdapter } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, getApproveContractData } from '@/lib/utils/evm'
import { assertGetNearChainAdapter } from '@/lib/utils/near'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetStarknetChainAdapter } from '@/lib/utils/starknet'
import { assertGetSuiChainAdapter } from '@/lib/utils/sui'
import { thorchainBlockTimeMs } from '@/lib/utils/thorchain/constants'
import { assertGetTonChainAdapter } from '@/lib/utils/ton'
import { assertGetTronChainAdapter } from '@/lib/utils/tron'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { reactQueries } from '@/react-queries'
import { getInboundAddressesQuery, getMimirQuery } from '@/react-queries/queries/thornode'
import { selectInboundAddressData, selectIsTradingActive } from '@/react-queries/selectors'
import { getInputOutputRatioFromQuote } from '@/state/apis/swapper/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote } from '@/state/apis/swapper/types'
import type { ReduxState } from '@/state/reducer'
import { selectAssets } from '@/state/slices/assetsSlice/selectors'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import type { AppDispatch } from '@/state/store'

export const hydrateMarketData = async (
  dispatch: AppDispatch,
  sellAssetId: string,
  buyAssetId: string,
) => {
  await Promise.all([
    dispatch(marketApi.endpoints.findByAssetId.initiate(sellAssetId)),
    dispatch(marketApi.endpoints.findByAssetId.initiate(buyAssetId)),
  ])
}

export const createSwapperDeps = (state: ReduxState): SwapperDeps => ({
  assetsById: selectAssets(state),
  assertGetChainAdapter,
  assertGetEvmChainAdapter,
  assertGetUtxoChainAdapter,
  assertGetCosmosSdkChainAdapter,
  assertGetSolanaChainAdapter,
  assertGetTonChainAdapter,
  assertGetTronChainAdapter,
  assertGetSuiChainAdapter,
  assertGetNearChainAdapter,
  assertGetStarknetChainAdapter,
  fetchIsSmartContractAddressQuery,
  config: getConfig(),
  mixPanel: getMixPanel(),
})

export const processQuoteResultWithRatios = (
  quoteResult: QuoteResult | RateResult,
  getState: () => unknown,
) => {
  if (quoteResult.isErr()) {
    const error: SwapErrorRight = quoteResult.unwrapErr()
    return [
      {
        quote: undefined,
        error,
        inputOutputRatio: -Infinity,
        swapperName: quoteResult.swapperName,
      },
    ]
  }

  return quoteResult.unwrap().map((quote: TradeQuote | TradeRate) => {
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
}

export const checkTradingActivity = async (
  sellAssetId: string,
  buyAssetId: string,
  swapperName: SwapperName,
  error: SwapErrorRight | undefined,
  tradeType?: TradeType,
) => {
  if (error !== undefined) {
    return { isTradingActiveOnSellPool: false, isTradingActiveOnBuyPool: false }
  }

  const [isTradingActiveOnSellPool, isTradingActiveOnBuyPool] = await Promise.all(
    [sellAssetId, buyAssetId].map(async assetId => {
      if (![SwapperName.Thorchain, SwapperName.Mayachain].includes(swapperName)) return true

      const chainId = getChainIdBySwapper(swapperName)

      const inboundAddresses = await queryClient.fetchQuery({
        ...getInboundAddressesQuery(chainId),
        staleTime: 0,
        gcTime: 0,
      })

      const inboundAddressResponse = selectInboundAddressData(
        inboundAddresses,
        assetId,
        swapperName,
      )

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
    isTradingActiveOnSellPool: tradeType === TradeType.LongTailToL1 || isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool: tradeType === TradeType.L1ToLongTail || isTradingActiveOnBuyPool,
  }
}

type CreateApiQuoteParams = {
  sellAssetId: string
  buyAssetId: string
  sendAddress?: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  quoteOrRate: 'quote' | 'rate'
}

const getFirstHopApprovalNetworkFeeCryptoBaseUnit = async (
  quote: TradeQuote | TradeRate | undefined,
  sendAddress: string | undefined,
): Promise<string | undefined> => {
  try {
    if (!quote || !sendAddress) return

    const firstHop = quote.steps[0]
    const { allowanceContract, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = firstHop

    if (!allowanceContract) return
    if (fromAssetId(sellAsset.assetId).chainNamespace !== CHAIN_NAMESPACE.Evm) return

    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
    if (!contractAddress) return

    const allowanceResult = await queryClient.fetchQuery({
      ...reactQueries.common.allowanceCryptoBaseUnit(
        sellAsset.assetId,
        allowanceContract,
        sendAddress,
      ),
      staleTime: 30_000,
    })

    if (allowanceResult.isErr()) return
    if (bnOrZero(allowanceResult.unwrap()).gte(sellAmountIncludingProtocolFeesCryptoBaseUnit))
      return

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const data = getApproveContractData({
      approvalAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spender: allowanceContract,
      to: contractAddress,
      chainId: sellAsset.chainId,
    })

    // Legacy pricing - wallet EIP1559 support is unknown here, and the oracle's gasPrice is the
    // effective base + tip an eip1559 tx pays anyway
    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter,
      to: contractAddress,
      data,
      value: '0',
      from: sendAddress,
      supportsEIP1559: false,
    })

    return networkFeeCryptoBaseUnit
  } catch {
    // Validation degrades to the network-fee-only check when the allowance read or estimation fails
    return
  }
}

export const createApiQuote = async (
  quoteData: {
    quote: TradeQuote | TradeRate | undefined
    swapperName: SwapperName
    inputOutputRatio: number
    error: SwapErrorRight | undefined
  },
  state: ReduxState,
  params: CreateApiQuoteParams,
): Promise<ApiQuote> => {
  const { quote, swapperName, inputOutputRatio, error } = quoteData
  const tradeType = (quote as ThorTradeQuote)?.tradeType

  const quoteSource = quoteData.quote?.steps[0].source ?? quoteData.swapperName

  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = await checkTradingActivity(
    params.sellAssetId,
    params.buyAssetId,
    swapperName,
    error,
    tradeType,
  )

  const firstHopApprovalNetworkFeeCryptoBaseUnit =
    await getFirstHopApprovalNetworkFeeCryptoBaseUnit(quote, params.sendAddress)

  const { errors, warnings } = validateTradeQuote(state, {
    swapperName,
    quote,
    error,
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    sendAddress: params.sendAddress,
    inputSellAmountCryptoBaseUnit: params.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    quoteOrRate: params.quoteOrRate,
    firstHopApprovalNetworkFeeCryptoBaseUnit,
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
}
