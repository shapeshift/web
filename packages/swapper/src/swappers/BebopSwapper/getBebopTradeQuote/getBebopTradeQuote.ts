import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchBebopQuote } from '../utils/fetchFromBebop'
import { assertValidTrade, calculateRate } from '../utils/helpers/helpers'

export async function getBebopTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  // Validate the trade
  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  // Get slippage tolerance
  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  // Fetch quote from Bebop
  const maybeBebopQuoteResponse = await fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAddress: receiveAddress as Address,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const bebopQuoteResponse = maybeBebopQuoteResponse.unwrap()

  // Get the best price route by matching the type
  const bestRoute = bebopQuoteResponse.routes.find(r => r.type === bebopQuoteResponse.bestPrice)
  if (!bestRoute || !bestRoute.quote) {
    return Err(
      makeSwapErrorRight({
        message: 'No best route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const quote = bestRoute.quote

  // Get the sell and buy token addresses
  const sellTokenAddress = Object.keys(quote.sellTokens)[0] as Address
  const buyTokenAddress = Object.keys(quote.buyTokens)[0] as Address

  if (!sellTokenAddress || !buyTokenAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token data in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  // Get amounts from the tokens data
  const sellAmount = quote.sellTokens[sellTokenAddress].amount
  const buyAmount = quote.buyTokens[buyTokenAddress].amount

  // Use transaction data from the quote response
  const transactionMetadata: TradeQuoteStep['bebopTransactionMetadata'] = {
    to: quote.tx.to,
    data: quote.tx.data as Address,
    value: quote.tx.value,
    gas: quote.tx.gas,
  }

  // Calculate rate
  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  // Use amountBeforeFee if available, otherwise use the regular amount
  const buyTokenData = quote.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  try {
    // Get network fee estimation
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()

    // Use gas limit from tx if available, otherwise derive from gas fee
    const gasLimit =
      quote.tx.gas ||
      (() => {
        const gasPriceWei = average.gasPrice || average.maxFeePerGas || '20000000000' // 20 gwei fallback
        return bnOrZero(quote.gasFee.native)
          .dividedBy(gasPriceWei)
          .multipliedBy(1.2) // Add 20% buffer for safety
          .integerValue()
          .toString()
      })()

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      gasLimit,
    })

    // Build the trade quote
    return Ok({
      id: uuid(),
      quoteOrRate: 'quote' as const,
      receiveAddress,
      affiliateBps,
      slippageTolerancePercentageDecimal,
      rate,
      swapperName: SwapperName.Bebop,
      steps: [
        {
          // Assume instant execution for same-chain swaps
          estimatedExecutionTimeMs: 0,
          // Use approval target from the quote
          allowanceContract: isNativeEvmAsset(sellAsset.assetId) ? undefined : quote.approvalTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {}, // Bebop doesn't charge protocol fees
            networkFeeCryptoBaseUnit,
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Bebop,
          bebopTransactionMetadata: transactionMetadata,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
