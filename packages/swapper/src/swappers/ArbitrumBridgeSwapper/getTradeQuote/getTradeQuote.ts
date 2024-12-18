import { ethChainId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type {
  ArbitrumBridgeTradeQuote,
  ArbitrumBridgeTradeRate,
  GetEvmTradeQuoteInputWithWallet,
} from '../types'
import type { FetchArbitrumBridgeQuoteInput } from '../utils/fetchArbitrumBridgeSwap'
import { fetchArbitrumBridgeQuote } from '../utils/fetchArbitrumBridgeSwap'
import { assertValidTrade } from '../utils/helpers'

export const isArbitrumBridgeTradeQuoteOrRate = (
  quote: TradeQuote | TradeRate | undefined,
): quote is ArbitrumBridgeTradeQuote | ArbitrumBridgeTradeRate => !!quote && 'direction' in quote

export const getTradeQuoteWithWallet = async (
  inputWithWallet: GetEvmTradeQuoteInputWithWallet,
  deps: SwapperDeps,
) => {
  const { wallet, ...input } = inputWithWallet
  const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

  return getTradeQuote(
    {
      ...input,
      supportsEIP1559,
    },
    deps,
  )
}

export async function getTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  { assertGetEvmChainAdapter }: SwapperDeps,
): Promise<Result<ArbitrumBridgeTradeQuote, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    accountNumber,
    supportsEIP1559,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
  } = input

  const assertion = await assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const isDeposit = sellAsset.chainId === ethChainId

  // 15 minutes for deposits, 7 days for withdrawals
  const estimatedExecutionTimeMs = isDeposit ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

  // 1/1 when bridging on Arbitrum bridge
  const rate = '1'

  try {
    const args = {
      supportsEIP1559: Boolean(supportsEIP1559),
      chainId,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      sendAddress,
      receiveAddress,
      assertGetEvmChainAdapter,
      quoteOrRate: 'quote',
    }
    const swap = await fetchArbitrumBridgeQuote(args as FetchArbitrumBridgeQuoteInput)

    const buyAmountBeforeFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit
    const buyAmountAfterFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit

    return Ok({
      id: uuid(),
      quoteOrRate: 'quote' as const,
      receiveAddress,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      rate,
      slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.ArbitrumBridge,
      ),
      steps: [
        {
          estimatedExecutionTimeMs,
          allowanceContract: swap.allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: swap.networkFeeCryptoBaseUnit,
          },
          source: SwapperName.ArbitrumBridge,
        },
      ] as SingleHopTradeQuoteSteps,
      direction: isDeposit ? ('deposit' as const) : ('withdrawal' as const),
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[ArbitrumBridge: tradeQuote] - failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
