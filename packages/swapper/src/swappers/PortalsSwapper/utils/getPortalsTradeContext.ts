import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import type {
  PortalsSupportedChainId,
  PortalsTradeQuoteInput,
  PortalsTradeRateInput,
} from '../types'
import type { PortalsTradeOrderResponse, PortalsTx } from './fetchPortalsTradeOrder'
import { getPortalsRouterAddressByChainId } from './helpers'

type PortalsTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: {
    deps: SwapperDeps
    sellAsset: Asset
    sellAmountCryptoBaseUnit: string
    spenderAddress: string
    tx: PortalsTx
  }
}

export const getPortalsTradeContext = ({
  input,
  deps,
  sellChainId,
  orderContext,
  outputToken,
  tx,
}: {
  input: PortalsTradeQuoteInput | PortalsTradeRateInput
  deps: SwapperDeps
  sellChainId: PortalsSupportedChainId
  orderContext: PortalsTradeOrderResponse['context']
  outputToken: string
  tx: PortalsTx
}): Result<PortalsTradeContext, SwapErrorRight> => {
  const { sellAsset, buyAsset, affiliateBps, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input
  const {
    orderId,
    outputAmount,
    minOutputAmount,
    target,
    feeAmount,
    feeToken,
    slippageTolerancePercentage,
  } = orderContext

  const isCrossChain = sellAsset.chainId !== buyAsset.chainId

  // Portals report the slippage they applied, not the one we requested - bridge routes apply none
  const appliedSlippageDecimal = bnOrZero(slippageTolerancePercentage).div(100)

  // Unvalidated orders report the post-slippage minimum in both amount fields
  const hasSlippageBuffer = bnOrZero(outputAmount).gt(minOutputAmount)

  const preSlippageOutputAmount = bnOrZero(minOutputAmount)
    .div(bn(1).minus(appliedSlippageDecimal))
    .toFixed(0)

  const buyAmountAfterFeesCryptoBaseUnit = hasSlippageBuffer
    ? outputAmount
    : preSlippageOutputAmount

  const bufferSlippageDecimal = hasSlippageBuffer
    ? bnOrZero(outputAmount).minus(minOutputAmount).div(outputAmount)
    : appliedSlippageDecimal

  const slippageTolerancePercentageDecimal = BigNumber.max(
    appliedSlippageDecimal,
    bufferSlippageDecimal,
  ).toString()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  // Cross-chain approves the route target; same-chain approves the Portals router
  const allowanceContract = isCrossChain ? target : getPortalsRouterAddressByChainId(sellChainId)

  if (allowanceContract === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `no Portals router for chainId ${sellChainId}`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellChainId },
      }),
    )
  }

  // Portals lower-case echoed tokens, and take their fee in the sell asset on ERC20 sells
  const isBuyAssetFee = feeToken?.toLowerCase() === outputToken.toLowerCase()

  const protocolFeeAsset = isBuyAssetFee ? buyAsset : sellAsset

  // Portals report an output already net of their fee
  const buyAmountBeforeFeesCryptoBaseUnit =
    isBuyAssetFee && feeAmount
      ? bnOrZero(buyAmountAfterFeesCryptoBaseUnit).plus(feeAmount).toFixed(0)
      : buyAmountAfterFeesCryptoBaseUnit

  const protocolFees: QuoteFeeData['protocolFees'] = (() => {
    if (!feeToken || !feeAmount) return

    return {
      [protocolFeeAsset.assetId]: {
        amountCryptoBaseUnit: feeAmount,
        asset: protocolFeeAsset,
        requiresBalance: false,
      },
    }
  })()

  return Ok({
    tradeCommon: {
      id: orderId,
      rate,
      swapperName: SwapperName.Portals,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: isCrossChain ? 300000 : 0,
      allowanceContract,
      rate,
      buyAsset,
      sellAsset,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      source: SwapperName.Portals,
      affiliateFee: buildAffiliateFee({
        strategy: 'buy_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        isEstimate: true,
      }),
    },
    protocolFees,
    stepDataArgs: {
      deps,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      tx,
    },
  })
}
