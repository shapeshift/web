import { CHAIN_NAMESPACE, fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getRate, makeSwapErrorRight } from '../../../utils'
import { getJupiterSwap, isSupportedChainId } from '../utils/helpers'

const _getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentageDecimal,
  } = input

  const jupiterUrl = deps.config.REACT_APP_JUPITER_API_URL

  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  const maybeQuoteResponse = await getJupiterSwap({
    apiUrl: jupiterUrl,
    sourceAsset: sellAsset.assetId,
    destinationAsset: buyAsset.assetId,
    commissionBps: affiliateBps,
    amount: sellAmount,
    slippageBps: slippageTolerancePercentageDecimal,
  })

  if (maybeQuoteResponse.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: 'Quote request failed',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const { data: quoteResponse } = maybeQuoteResponse.unwrap()

  const getFeeData = async () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Solana: {
        const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
        const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
          // Simulates a self-send, since we don't know the to just yet at this stage
          to: input.sendAddress!,
          value: sellAmount,
          chainSpecific: {
            from: input.sendAddress!,
            tokenId:
              sellAsset.assetId === solAssetId
                ? undefined
                : fromAssetId(sellAsset.assetId).assetReference,
          },
        }
        const { fast } = await sellAdapter.getFeeData(getFeeDataInput)
        return { networkFeeCryptoBaseUnit: fast.txFee }
      }

      default:
        throw new Error('Unsupported chainNamespace')
    }
  }

  const getQuoteRate = (sellAmountCryptoBaseUnit: string, buyAmountCryptoBaseUnit: string) => {
    return getRate({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })
  }

  const quotes: TradeQuote[] = []

  const feeData = await getFeeData()

  const rate = getQuoteRate(quoteResponse.inAmount, quoteResponse.outAmount)

  const tradeQuote: TradeQuote = {
    id: uuid(),
    rate,
    receiveAddress,
    potentialAffiliateBps: affiliateBps,
    affiliateBps,
    isStreaming: false,
    slippageTolerancePercentageDecimal:
      input.slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit: quoteResponse.outAmount,
        buyAmountAfterFeesCryptoBaseUnit: quoteResponse.outAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: quoteResponse.inAmount,
        feeData: {
          // @TODO: calculate fees
          protocolFees: {},
          ...feeData,
        },
        rate,
        source: SwapperName.Jupiter,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract: '0x0', // Chainflip does not use contracts - all Txs are sends
        estimatedExecutionTimeMs: quoteResponse.timeTaken! * 1000,
      },
    ],
  }

  quotes.push(tradeQuote)

  return Ok(quotes)
}

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const rates = await _getTradeQuote(input as unknown as CommonTradeQuoteInput, deps)
  return rates as Result<TradeRate[], SwapErrorRight>
}

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const quotes = await _getTradeQuote(input, deps)
  return quotes
}
