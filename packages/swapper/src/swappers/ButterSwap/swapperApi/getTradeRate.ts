import { fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero, chainIdToFeeAssetId, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { DEFAULT_BUTTERSWAP_AFFILIATE_BPS, makeButterSwapAffiliate } from '../utils/constants'
import { butterSwapErrorToTradeQuoteError, getButterRoute, isRouteSuccess } from '../xhr'

export const getTradeRate = async (
  input: GetTradeRateInput,
  _deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    affiliateBps,
    accountNumber,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const amount = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit)
    .shiftedBy(-sellAsset.precision)
    .toString()

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)
  const sellAssetIsNative = sellAsset.assetId === feeAssetId
  const buyAssetIsNative = buyAsset.assetId === chainIdToFeeAssetId(buyAsset.chainId)

  const { assetReference: sellAssetAddressRaw } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddressRaw } = fromAssetId(buyAsset.assetId)

  const sellAssetAddress = sellAssetIsNative ? zeroAddress : sellAssetAddressRaw
  const buyAssetAddress = buyAssetIsNative ? zeroAddress : buyAssetAddressRaw

  const slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
    SwapperName.ButterSwap,
  )
  const slippage = bn(slippageTolerancePercentageDecimal).times(10000).toString()

  const result = await getButterRoute({
    fromChainId: sellAsset.chainId,
    sellAssetAddress,
    toChainId: buyAsset.chainId,
    buyAssetAddress,
    amountHumanUnits: amount,
    slippage,
    affiliate: makeButterSwapAffiliate(affiliateBps ?? DEFAULT_BUTTERSWAP_AFFILIATE_BPS),
  })

  if (result.isErr()) return Err(result.unwrapErr())
  const routeResponse = result.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    if (routeResponse.errno === 2003 && routeResponse.message === 'No Route Found') {
      return Err(
        makeSwapErrorRight({
          message: '[getTradeRate] No route found',
          code: butterSwapErrorToTradeQuoteError(routeResponse.errno),
        }),
      )
    }
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate] ${routeResponse.message}`,
        code: butterSwapErrorToTradeQuoteError(routeResponse.errno),
      }),
    )
  }

  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeRate] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // Determine input and output for rate calculation
  const inputAmount = bnOrZero(route.srcChain.totalAmountIn)
  // Prefer dstChain if present, else srcChain
  const outputAmount = route.dstChain?.totalAmountOut ?? route.srcChain.totalAmountOut

  const rate = inputAmount.gt(0) ? bnOrZero(outputAmount).div(inputAmount).toString() : '0'

  const feeAsset = _deps.assetsById[feeAssetId]
  if (!feeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate] Fee asset not found for chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Map gasFee.amount to networkFeeCryptoBaseUnit using fee asset precision
  const networkFeeCryptoBaseUnit = bnOrZero(route.gasFee?.amount).gt(0)
    ? toBaseUnit(route.gasFee.amount, feeAsset.precision)
    : '0'

  // Always a single step
  const step = {
    rate,
    buyAmountBeforeFeesCryptoBaseUnit: toBaseUnit(outputAmount, buyAsset.precision),
    buyAmountAfterFeesCryptoBaseUnit: toBaseUnit(outputAmount, buyAsset.precision),
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    feeData: {
      networkFeeCryptoBaseUnit,
      protocolFees: undefined,
    },
    source: SwapperName.ButterSwap,
    buyAsset,
    sellAsset,
    accountNumber,
    allowanceContract: route.contract ?? '0x0',
    estimatedExecutionTimeMs: route.timeEstimated * 1000,
  }

  const tradeRate: TradeRate = {
    id: route.hash,
    rate,
    swapperName: SwapperName.ButterSwap,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    quoteOrRate: 'rate',
    steps: [step],
  }

  return Ok([tradeRate])
}
