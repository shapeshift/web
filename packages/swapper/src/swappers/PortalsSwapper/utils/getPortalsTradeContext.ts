import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
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
  stepDataArgs: { deps: SwapperDeps; sellAsset: Asset; tx: PortalsTx }
}

export const getPortalsTradeContext = ({
  input,
  deps,
  sellChainId,
  inputToken,
  orderContext,
  tx,
}: {
  input: PortalsTradeQuoteInput | PortalsTradeRateInput
  deps: SwapperDeps
  sellChainId: PortalsSupportedChainId
  inputToken: string
  orderContext: PortalsTradeOrderResponse['context']
  tx: PortalsTx
}): Result<PortalsTradeContext, SwapErrorRight> => {
  const { sellAsset, buyAsset, affiliateBps, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input
  const { orderId, outputAmount, minOutputAmount, target, feeAmount, feeToken } = orderContext

  const isCrossChain = sellAsset.chainId !== buyAsset.chainId

  const buyAmountAfterFeesCryptoBaseUnit = isCrossChain ? minOutputAmount : outputAmount

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

  // Portals reports the slippage we requested, not what it applied — recover the actual buffer from the amounts
  const actualBufferDecimal = bnOrZero(buyAmountAfterFeesCryptoBaseUnit)
    .minus(minOutputAmount)
    .div(buyAmountAfterFeesCryptoBaseUnit)
    .toString()

  // Reverse the buffer to recover the expected output (minOutput / (1 - buffer) = output)
  const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(minOutputAmount)
    .div(bn(1).minus(actualBufferDecimal))
    .toFixed(0)

  const protocolFeeAsset = feeToken === inputToken ? sellAsset : buyAsset

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
      slippageTolerancePercentageDecimal: actualBufferDecimal,
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
    stepDataArgs: { deps, sellAsset, tx },
  })
}
