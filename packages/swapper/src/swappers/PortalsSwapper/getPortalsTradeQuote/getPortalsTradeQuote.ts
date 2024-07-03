import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import {
  type GetEvmTradeQuoteInput,
  type SingleHopTradeQuoteSteps,
  type SwapErrorRight,
  SwapperName,
  type TradeQuote,
  TradeQuoteError,
} from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { chainIdToPortalsNetwork } from '../utils/constants'
import { fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'

export async function getPortalsTradeQuote(
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sendAddress,
    // TODO(gomes): consume me
    // accountNumber,
    // receiveAddress,
    // affiliateBps,
    // potentialAffiliateBps,
    // chainId,
    // supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals)

  try {
    const portalsNetwork = chainIdToPortalsNetwork[input.chainId as KnownChainIds]
    if (!portalsNetwork) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported ChainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: input.chainId },
        }),
      )
    }
    const portalsTradeOrderResponse = await fetchPortalsTradeOrder({
      // TODO(gomes): why is this optional wtf
      sender: sendAddress!,
      // TODO(gomes): handle native EVM assets
      inputToken: `${portalsNetwork}:${fromAssetId(sellAsset.assetId).assetReference}`,
      outputToken: `${portalsNetwork}:${fromAssetId(buyAsset.assetId).assetReference}`,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: Number(slippageTolerancePercentageDecimal) * 100,
      // TODO(gomes): partner, yep, portals supports it!
    })

    const {
      context: {
        orderId,
        outputAmount: buyAmountAfterFeesCryptoBaseUnit,
        minOutputAmount: buyAmountBeforeFeesCryptoBaseUnit,
        slippageTolerancePercentage,
        target: allowanceContract,
        feeAmount,
      },
    } = portalsTradeOrderResponse

    const rate = bn(buyAmountAfterFeesCryptoBaseUnit)
      .div(input.sellAmountIncludingProtocolFeesCryptoBaseUnit)
      .toString()

    const networkFeeCryptoBaseUnit = '0' // TODO(gomes)
    const tradeQuote: TradeQuote = {
      id: orderId,
      receiveAddress: input.receiveAddress,
      affiliateBps: input.affiliateBps,
      potentialAffiliateBps: input.potentialAffiliateBps,
      rate,
      slippageTolerancePercentageDecimal: (slippageTolerancePercentage / 100).toString(),
      steps: [
        {
          allowanceContract,
          rate,
          buyAsset: input.buyAsset,
          sellAsset: input.sellAsset,
          accountNumber: input.accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit:
            input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: feeAmount
              ? {
                  [input.sellAsset.assetId]: {
                    amountCryptoBaseUnit: feeAmount,
                    asset: input.sellAsset,
                    requiresBalance: true,
                  },
                }
              : {},
          },
          source: SwapperName.Portals,
          estimatedExecutionTimeMs: undefined, // Portals doesn't provide this info
        },
      ] as SingleHopTradeQuoteSteps,
    }

    return Ok(tradeQuote)
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get Portals quote',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
