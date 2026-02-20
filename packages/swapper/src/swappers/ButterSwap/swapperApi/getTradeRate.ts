import { btcChainId, solanaChainId, tronChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  BigAmount,
  bnOrZero,
  chainIdToFeeAssetId,
  convertDecimalPercentageToBasisPoints,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { makeButterSwapAffiliate } from '../utils/constants'
import {
  ButterSwapErrorCode,
  butterSwapErrorToTradeQuoteError,
  getButterRoute,
  isRouteSuccess,
} from '../xhr'

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

  if (
    !isEvmChainId(sellAsset.chainId) &&
    sellAsset.chainId !== btcChainId &&
    sellAsset.chainId !== solanaChainId &&
    sellAsset.chainId !== tronChainId
  ) {
    return Err(
      makeSwapErrorRight({
        message: `Unsupported chain`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const amount = BigAmount.fromBaseUnit({
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    precision: sellAsset.precision,
  }).toPrecision()

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)

  const slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
    SwapperName.ButterSwap,
  )
  const slippage = convertDecimalPercentageToBasisPoints(
    slippageTolerancePercentageDecimal,
  ).toString()

  const result = await getButterRoute({
    sellAsset,
    buyAsset,
    sellAmountCryptoPrecision: amount,
    slippage,
    affiliate: makeButterSwapAffiliate(affiliateBps),
  })
  if (result.isErr()) {
    return Err(result.unwrapErr())
  }
  const routeResponse = result.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    if (routeResponse.errno === ButterSwapErrorCode.InsufficientAmount) {
      const minAmountCryptoBaseUnit = BigAmount.fromPrecision({
        value: (routeResponse as any).minAmount,
        precision: sellAsset.precision,
      }).toBaseUnit()
      return Err(
        createTradeAmountTooSmallErr({
          minAmountCryptoBaseUnit,
          assetId: sellAsset.assetId,
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

  // Use destination receive amount as a priority if present and defined
  // It won't for same-chain swaps, so we fall back to the source chain receive amount (i.e source chain *is* the destination chain)
  const outputAmount = route.dstChain?.totalAmountOut ?? route.srcChain.totalAmountOut

  // TODO: affiliate fees not yet here, gut feel is that Butter won't do the swap output - fees logic for us here
  // Sanity check me when affiliates are implemented, and do the math ourselves if needed
  const buyAmountAfterFeesCryptoBaseUnit = BigAmount.fromPrecision({
    value: outputAmount,
    precision: buyAsset.precision,
  }).toBaseUnit()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

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
    ? BigAmount.fromPrecision({
        value: route.gasFee.amount,
        precision: feeAsset.precision,
      }).toBaseUnit()
    : '0'

  // Always a single step
  const step = {
    rate,
    buyAmountBeforeFeesCryptoBaseUnit: BigAmount.fromPrecision({
      value: outputAmount,
      precision: buyAsset.precision,
    }).toBaseUnit(),
    buyAmountAfterFeesCryptoBaseUnit,
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
