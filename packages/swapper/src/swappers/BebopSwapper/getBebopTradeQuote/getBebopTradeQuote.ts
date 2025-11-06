import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'
import { fromHex, isAddress } from 'viem'

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
import { BEBOP_DUMMY_ADDRESS } from '../types'
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
    sendAddress,
    receiveAddress,
    affiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const takerAddress = (sendAddress || receiveAddress) as Address

  if (takerAddress === BEBOP_DUMMY_ADDRESS) {
    return Err(
      makeSwapErrorRight({
        message: 'Cannot execute quote with dummy address - wallet required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopQuoteResponse = await fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress,
    receiverAddress: receiveAddress as Address,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const bebopQuoteResponse = maybeBebopQuoteResponse.unwrap()

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

  const sellTokenAddress = Object.keys(quote.sellTokens)[0]
  const buyTokenAddress = Object.keys(quote.buyTokens)[0]

  if (!isAddress(sellTokenAddress) || !isAddress(buyTokenAddress)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token addresses in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const sellAmount = quote.sellTokens[sellTokenAddress].amount
  const buyAmount = quote.buyTokens[buyTokenAddress].amount

  const transactionMetadata: TradeQuoteStep['bebopTransactionMetadata'] = {
    to: quote.tx.to,
    data: quote.tx.data,
    value: quote.tx.value,
    gas: quote.tx.gas,
  }

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = quote.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { fast } = await adapter.getGasFeeData()

    // Convert gas limit from hex to decimal string (Bebop returns hex values)
    const gasLimitFromQuote = quote.tx.gas ? fromHex(quote.tx.gas, 'bigint').toString() : '0'

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...fast,
      supportsEIP1559: Boolean(supportsEIP1559),
      gasLimit: gasLimitFromQuote,
    })

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
          estimatedExecutionTimeMs: 0,
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
