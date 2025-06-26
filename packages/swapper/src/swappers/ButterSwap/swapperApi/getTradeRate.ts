import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { PartialRecord } from '@shapeshiftoss/types'
import { bn, bnOrZero, chainIdToFeeAssetId, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetTradeRateInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { ZERO_ADDRESS } from '../utils/constants'
import { chainIdToButterSwapChainId } from '../utils/helpers'
import { getRoute, isRouteSuccess } from '../xhr'

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

  const fromChainId = chainIdToButterSwapChainId(sellAsset.chainId)
  const toChainId = chainIdToButterSwapChainId(buyAsset.chainId)

  if (!fromChainId || !toChainId) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeRate] Unsupported chainId',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const amount = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit)
    .shiftedBy(-sellAsset.precision)
    .toString()

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)
  const sellAssetIsNative = sellAsset.assetId === feeAssetId
  const buyAssetIsNative = buyAsset.assetId === chainIdToFeeAssetId(buyAsset.chainId)

  const { assetReference: sellAssetAddressRaw } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddressRaw } = fromAssetId(buyAsset.assetId)

  const sellAssetAddress = sellAssetIsNative ? ZERO_ADDRESS : sellAssetAddressRaw
  const buyAssetAddress = buyAssetIsNative ? ZERO_ADDRESS : buyAssetAddressRaw

  const slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
    SwapperName.ButterSwap,
  )
  const slippage = bn(slippageTolerancePercentageDecimal).times(10000).toString()

  const result = await getRoute(
    fromChainId,
    sellAssetAddress,
    toChainId,
    buyAssetAddress,
    amount,
    slippage,
  )

  if (result.isErr()) return Err(result.unwrapErr())
  const routeResponse = result.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate] ${routeResponse.message}`,
        code: TradeQuoteError.QueryFailed,
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

  const rate = bnOrZero(route.srcChain.totalAmountOut).div(route.srcChain.totalAmountIn).toString()

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

  const nativeFeeBaseUnit = bnOrZero(route.swapFee.nativeFee).gt(0)
    ? toBaseUnit(route.swapFee.nativeFee, feeAsset.precision)
    : '0'
  const tokenFeeBaseUnit = bnOrZero(route.swapFee.tokenFee).gt(0)
    ? toBaseUnit(route.swapFee.tokenFee, sellAsset.precision)
    : '0'

  let protocolFees: PartialRecord<AssetId, ProtocolFee> | undefined = undefined
  const hasNativeFee = bnOrZero(nativeFeeBaseUnit).gt(0)
  const hasTokenFee = bnOrZero(tokenFeeBaseUnit).gt(0)

  if (hasNativeFee && hasTokenFee && feeAssetId === sellAsset.assetId) {
    // If both fees are for the same asset, sum them
    protocolFees = {
      [feeAssetId]: {
        amountCryptoBaseUnit: bnOrZero(nativeFeeBaseUnit).plus(tokenFeeBaseUnit).toString(),
        requiresBalance: true,
        asset: feeAsset,
      },
    }
  } else {
    protocolFees = {}
    if (hasNativeFee) {
      protocolFees[feeAssetId] = {
        amountCryptoBaseUnit: nativeFeeBaseUnit,
        requiresBalance: true,
        asset: feeAsset,
      }
    }
    if (hasTokenFee) {
      protocolFees[sellAsset.assetId] = {
        amountCryptoBaseUnit: tokenFeeBaseUnit,
        requiresBalance: true,
        asset: sellAsset,
      }
    }
    if (Object.keys(protocolFees).length === 0) protocolFees = undefined
  }

  const tradeRate: TradeRate = {
    id: route.hash,
    rate,
    swapperName: SwapperName.ButterSwap,
    receiveAddress,
    affiliateBps: affiliateBps ?? '0',
    slippageTolerancePercentageDecimal,
    quoteOrRate: 'rate',
    steps: [
      {
        rate,
        buyAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
          route.srcChain.totalAmountOut,
          buyAsset.precision,
        ),
        buyAmountAfterFeesCryptoBaseUnit: toBaseUnit(
          route.srcChain.totalAmountOut,
          buyAsset.precision,
        ),
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        feeData: {
          networkFeeCryptoBaseUnit,
          protocolFees,
        },
        source: SwapperName.ButterSwap, // TODO - from step/route
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract: route.contract ?? '0x0',
        estimatedExecutionTimeMs: route.timeEstimated * 1000, // butterswap returns in seconds
      },
    ],
  }

  return Ok([tradeRate])
}
