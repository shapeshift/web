import { fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero, chainIdToFeeAssetId, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { DEFAULT_BUTTERSWAP_AFFILIATE_BPS, ZERO_ADDRESS } from '../utils/constants'
import { chainIdToButterSwapChainId } from '../utils/helpers'
import { getBuildTx, getRoute, isBuildTxSuccess, isRouteSuccess } from '../xhr'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  _deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
    receiveAddress,
    slippageTolerancePercentageDecimal,
    accountNumber,
  } = input

  // Map ShapeShift chain IDs to ButterSwap numeric chain IDs
  const butterSwapFromChainId = chainIdToButterSwapChainId(sellAsset.chainId)
  const butterSwapToChainId = chainIdToButterSwapChainId(buyAsset.chainId)
  if (!butterSwapFromChainId || !butterSwapToChainId) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] Unsupported chainId',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)
  const sellAssetIsNative = sellAsset.assetId === feeAssetId
  const buyAssetIsNative = buyAsset.assetId === chainIdToFeeAssetId(buyAsset.chainId)

  const { assetReference: sellAssetAddressRaw } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddressRaw } = fromAssetId(buyAsset.assetId)

  const sellAssetAddress = sellAssetIsNative ? ZERO_ADDRESS : sellAssetAddressRaw
  const buyAssetAddress = buyAssetIsNative ? ZERO_ADDRESS : buyAssetAddressRaw
  const slippageDecimal =
    slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
  const slippage = bn(slippageDecimal).times(10000).toString()

  // Call ButterSwap /route API
  const routeResult = await getRoute(
    butterSwapFromChainId,
    sellAssetAddress,
    butterSwapToChainId,
    buyAssetAddress,
    bn(amount).shiftedBy(-sellAsset.precision).toString(), // convert to human units
    slippage,
  )

  if (routeResult.isErr()) return Err(routeResult.unwrapErr())
  const routeResponse = routeResult.unwrap()
  if (!isRouteSuccess(routeResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] ${routeResponse.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // Call ButterSwap /swap API to get calldata and contract info
  const buildTxResult = await getBuildTx(
    route.hash,
    slippage,
    receiveAddress, // from
    receiveAddress, // receiver
  )
  if (buildTxResult.isErr()) return Err(buildTxResult.unwrapErr())
  const buildTxResponse = buildTxResult.unwrap()
  if (!isBuildTxSuccess(buildTxResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] /swap failed: ${buildTxResponse.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  const buildTx = buildTxResponse.data[0]
  if (!buildTx) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No buildTx data returned',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  // Fee asset for network/protocol fees
  const feeAsset = _deps.assetsById[feeAssetId]
  if (!feeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] Fee asset not found for chainId ${sellAsset.chainId}`,
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

  let protocolFees: Record<string, ProtocolFee> | undefined = undefined
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

  // Calculate rate as totalAmountOut / totalAmountIn (in base units)
  const rate = bnOrZero(route.srcChain.totalAmountOut).div(route.srcChain.totalAmountIn).toString()

  const tradeQuote: TradeQuote = {
    id: route.hash,
    rate,
    receiveAddress,
    affiliateBps: DEFAULT_BUTTERSWAP_AFFILIATE_BPS.toString(),
    isStreaming: false,
    quoteOrRate: 'quote',
    swapperName: SwapperName.ButterSwap,
    slippageTolerancePercentageDecimal: slippageDecimal,
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
          route.srcChain.totalAmountOut,
          buyAsset.precision,
        ),
        buyAmountAfterFeesCryptoBaseUnit: toBaseUnit(
          route.srcChain.totalAmountOut,
          buyAsset.precision,
        ),
        sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
        feeData: {
          networkFeeCryptoBaseUnit,
          protocolFees,
        },
        rate,
        source: SwapperName.ButterSwap,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract: route.contract ?? '0x0',
        estimatedExecutionTimeMs: route.timeEstimated * 1000, // seconds to ms
        butterSwapTransactionMetadata: {
          to: buildTx.to,
          data: buildTx.data,
          value: buildTx.value,
          chainId: buildTx.chainId,
          method: buildTx.method,
          args: buildTx.args?.map(arg => ({
            type: arg.type,
            value: Object.prototype.hasOwnProperty.call(arg, 'value') ? arg.value : null,
          })),
        },
      },
    ],
  }

  return Ok([tradeQuote])
}
