import type {
  BridgeDefinition,
  ChainKey,
  LifiError,
  RoutesRequest,
  Token as LifiToken,
} from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { GetEvmTradeQuoteInput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { BigNumber, bn, bnOrZero, convertPrecision, fromHuman } from 'lib/bignumber/bignumber'
import {
  DEFAULT_SOURCE,
  MAX_LIFI_TRADE,
  MIN_AMOUNT_THRESHOLD_USD_HUMAN,
  SELECTED_ROUTE_INDEX,
} from 'lib/swapper/LifiSwapper/utils/constants'
import { getAssetBalance } from 'lib/swapper/LifiSwapper/utils/getAssetBalance/getAssetBalance'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import { getMinimumUsdHumanFromRoutes } from 'lib/swapper/LifiSwapper/utils/getMinimumUsdHumanFromRoutes/getMinimumUsdHumanFromRoutes'
import { transformLifiFeeData } from 'lib/swapper/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from 'lib/swapper/LifiSwapper/utils/types'
import { selectMarketDataById } from 'state/slices/selectors'
import { store } from 'state/store'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiAssetMap: Map<AssetId, LifiToken>,
  lifiChainMap: Map<ChainId, ChainKey>,
  lifiBridges: BridgeDefinition[],
): Promise<LifiTradeQuote> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    sendMax,
    receiveAddress,
    accountNumber,
  } = input

  const sellLifiChainKey = lifiChainMap.get(sellAsset.chainId)
  const buyLifiChainKey = lifiChainMap.get(buyAsset.chainId)
  const sellLifiToken = lifiAssetMap.get(sellAsset.assetId)
  const buyLifiToken = lifiAssetMap.get(buyAsset.assetId)

  if (sellLifiChainKey === undefined || sellLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (buyLifiChainKey === undefined || buyLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (sellLifiChainKey === buyLifiChainKey) {
    throw new SwapError('[getTradeQuote] same chains swaps not supported', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
    })
  }

  const fromAmountCryptoLifiPrecision: BigNumber = sendMax
    ? getAssetBalance({
        asset: sellAsset,
        accountNumber,
        chainId,
        outputPrecision: sellLifiToken.decimals,
      })
    : convertPrecision({
        value: sellAmountBeforeFeesCryptoBaseUnit,
        inputPrecision: sellAsset.precision,
        outputPrecision: sellLifiToken.decimals,
      })

  // handle quotes that dont meet the minimum amount
  const { price } = selectMarketDataById(store.getState(), sellAsset.assetId)
  const minimumAmountThresholdCryptoHuman = bn(MIN_AMOUNT_THRESHOLD_USD_HUMAN).dividedBy(price)
  const minimumAmountThresholdCryptoLifi = fromHuman({
    value: minimumAmountThresholdCryptoHuman,
    outputPrecision: sellAsset.precision,
  })

  // LiFi cannot provide minimum trade amounts up front because the bridges and exchanges vary it
  // constantly. We can determine what the minimum amount from a successful request though, but
  // for a request to succeed the requested amount must be over the minimum.
  const thresholdedAmountCryptoLifi = BigNumber.max(
    fromAmountCryptoLifiPrecision,
    minimumAmountThresholdCryptoLifi,
  )
    .integerValue()
    .toString()

  const lifi = getLifi()

  const routesRequest: RoutesRequest = {
    fromChainId: Number(fromChainId(sellAsset.chainId).chainReference),
    toChainId: Number(fromChainId(buyAsset.chainId).chainReference),
    fromTokenAddress: sellLifiToken.address,
    toTokenAddress: buyLifiToken.address,
    fromAddress: receiveAddress,
    toAddress: receiveAddress,
    fromAmount: thresholdedAmountCryptoLifi,
    // as recommended by lifi, dodo is denied until they fix their gas estimates
    // TODO: convert this config to .env variable
    options: {
      slippage: Number(DEFAULT_SLIPPAGE),
      exchanges: { deny: ['dodo'] },
      // as recommended by lifi, allowSwitchChain must be false to ensure single-hop transactions.
      // This must remain disabled until our application supports multi-hop swaps
      allowSwitchChain: false,
    },
  }

  const lifiRoutesResponse = await lifi.getRoutes(routesRequest).catch((e: LifiError) => {
    const code = (() => {
      switch (e.code) {
        case LifiErrorCode.ValidationError:
          return SwapErrorType.VALIDATION_FAILED
        case LifiErrorCode.InternalError:
        case LifiErrorCode.Timeout:
          return SwapErrorType.RESPONSE_ERROR
        default:
          return SwapErrorType.TRADE_QUOTE_FAILED
      }
    })()
    throw new SwapError(`[getTradeQuote] ${e.message}`, { code })
  })

  const selectedRoute = lifiRoutesResponse.routes[SELECTED_ROUTE_INDEX]

  const minimumUsdHuman = getMinimumUsdHumanFromRoutes(lifiRoutesResponse.routes, lifiBridges)
  const minimumCryptoHuman =
    minimumUsdHuman && sellLifiToken.priceUSD
      ? minimumUsdHuman.dividedBy(sellLifiToken.priceUSD).toString()
      : '0'

  // for the rate to be valid, both amounts must be converted to the same precision
  const estimateRate = convertPrecision({
    value: selectedRoute.toAmount,
    inputPrecision: buyLifiToken.decimals,
    outputPrecision: sellLifiToken.decimals,
  })
    .dividedBy(bn(selectedRoute.fromAmount))
    .toString()

  // TODO: ask lifi if there could be more than 1 approval
  const allowanceContract = (() => {
    const uniqueApprovalAddresses = new Set(
      selectedRoute.steps
        .map(step => step.estimate.approvalAddress)
        .filter(approvalAddress => approvalAddress !== undefined),
    )

    if (uniqueApprovalAddresses.size !== 1) {
      throw new SwapError(
        `[getTradeQuote] expected exactly 1 approval address, found ${uniqueApprovalAddresses.size}`,
        {
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        },
      )
    }

    return [...uniqueApprovalAddresses.values()][0]
  })()

  const maxSlippage = BigNumber.max(...selectedRoute.steps.map(step => step.action.slippage))

  const feeData = transformLifiFeeData({
    buyLifiToken,
    chainId,
    lifiAssetMap,
    selectedRoute,
  })

  return {
    accountNumber,
    allowanceContract,
    buyAmountCryptoBaseUnit: bnOrZero(selectedRoute.toAmount).toString(),
    buyAsset,
    feeData,
    maximumCryptoHuman: MAX_LIFI_TRADE,
    minimumCryptoHuman,
    rate: estimateRate,
    recommendedSlippage: maxSlippage.toString(),
    sellAmountBeforeFeesCryptoBaseUnit,
    sellAsset,
    sources: DEFAULT_SOURCE, // TODO: use selected route steps to create sources

    // the following are required due to minimumCryptoHuman logical requirements downstream
    // TODO: Determine whether we can delete logic surrounding minimum amounts and instead lean on error
    // handling in the UI so we can re-use the routes response downstream to avoid another fetch
    routesRequest: {
      ...routesRequest,
      fromAmount: fromAmountCryptoLifiPrecision.toString(),
    },
  }
}
