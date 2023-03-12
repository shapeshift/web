import type {
  BridgeDefinition,
  ChainKey,
  LifiError,
  Route,
  RoutesRequest,
  Token as LifiToken,
} from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import {
  BigNumber,
  bn,
  bnOrZero,
  convertPrecision,
  fromHuman,
  toHuman,
} from 'lib/bignumber/bignumber'
import {
  DEFAULT_SOURCE,
  MAX_LIFI_TRADE,
  MIN_AMOUNT_THRESHOLD_USD_HUMAN,
  SELECTED_ROUTE_INDEX,
} from 'lib/swapper/LifiSwapper/utils/constants'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import { getMinimumAmountFromRoutes } from 'lib/swapper/LifiSwapper/utils/getMinimumAmountFromRoutes/getMinimumAmountFromRoutes'
import { transformLifiFeeData } from 'lib/swapper/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { store } from 'state/store'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiAssetMap: Map<AssetId, LifiToken>,
  lifiChainMap: Map<ChainId, ChainKey>,
  lifiBridges: BridgeDefinition[],
): Promise<TradeQuote<EvmChainId> & { route: Route }> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    sendMax,
    receiveAddress,
    accountNumber,
  } = input

  const fromLifiChainKey = lifiChainMap.get(sellAsset.chainId)
  const toLifiChainKey = lifiChainMap.get(buyAsset.chainId)
  const fromLifiToken = lifiAssetMap.get(sellAsset.assetId)
  const toLifiToken = lifiAssetMap.get(buyAsset.assetId)

  if (fromLifiChainKey === undefined || fromLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (toLifiChainKey === undefined || toLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (fromLifiChainKey === toLifiChainKey) {
    throw new SwapError('[getTradeQuote] same chains swaps not supported', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
    })
  }

  const fromAmountCryptoLifiPrecision: BigNumber = (() => {
    if (sendMax) {
      const accountId = selectAccountIdByAccountNumberAndChainId(store.getState(), {
        accountNumber,
        chainId,
      })

      if (accountId === undefined) {
        throw new SwapError('[getTradeQuote] no account id found', {
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        })
      }

      const balance = selectPortfolioCryptoBalanceBaseUnitByFilter(store.getState(), {
        accountId,
        assetId: sellAsset.assetId,
      })

      return convertPrecision({
        value: balance,
        inputPrecision: sellAsset.precision,
        outputPrecision: fromLifiToken.decimals,
      })
    }

    return convertPrecision({
      value: sellAmountBeforeFeesCryptoBaseUnit,
      inputPrecision: sellAsset.precision,
      outputPrecision: fromLifiToken.decimals,
    })
  })()

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
    fromTokenAddress: fromLifiToken.address,
    toTokenAddress: toLifiToken.address,
    fromAddress: receiveAddress,
    toAddress: receiveAddress,
    fromAmount: thresholdedAmountCryptoLifi,
    options: { slippage: Number(DEFAULT_SLIPPAGE) },
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

  const minimumCryptoHuman = toHuman({
    value: getMinimumAmountFromRoutes(lifiRoutesResponse.routes, lifiBridges) ?? Infinity,
    inputPrecision: fromLifiToken.decimals,
  }).toString()

  // for the rate to be valid, both amounts must be converted to the same precision
  const estimateRate = convertPrecision({
    value: selectedRoute.toAmount,
    inputPrecision: toLifiToken.decimals,
    outputPrecision: fromLifiToken.decimals,
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

  return {
    accountNumber,
    allowanceContract,
    buyAmountCryptoBaseUnit: bnOrZero(selectedRoute.toAmount).toString(),
    buyAsset,
    feeData: transformLifiFeeData(
      lifiRoutesResponse,
      SELECTED_ROUTE_INDEX,
      toLifiToken.address,
      fromLifiToken.address,
    ),
    maximum: MAX_LIFI_TRADE,
    minimumCryptoHuman,
    rate: estimateRate,
    recommendedSlippage: maxSlippage.toString(),
    sellAmountBeforeFeesCryptoBaseUnit,
    sellAsset,
    sources: DEFAULT_SOURCE, // TODO: use selected route steps to create sources
    route: selectedRoute,
  }
}
