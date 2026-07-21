import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import {
  THOR_ROUTER_CONTRACT_MAINNET,
  TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
  viemClientByChainId,
} from '@shapeshiftoss/contracts'
import type { EvmChainId } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import assert from 'assert'
import type { Address } from 'viem'

import type { ThorEvmTradeQuote, ThorTradeQuote } from '../../../thorchain-utils'
import { getL1RateOrQuote, swapIn, TradeType } from '../../../thorchain-utils'
import type {
  CommonTradeQuoteInput,
  MultiHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getBestAggregator } from './getBestAggregator'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

const LONGTAIL_TO_L1_DEADLINE_SECONDS = 600n

// This just uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  /*
    We only support ethereum longtail -> L1 swaps for now.
    We can later add BSC via UniV3, or Avalanche (e.g. via PancakeSwap)
  */
  if (sellAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${sellAsset.chainId}.`,
        code: TradeQuoteError.UnsupportedChain,
        details: { sellAssetChainId: sellAsset.chainId },
      }),
    )
  }

  const sellChainId = sellAsset.chainId
  const buyAssetFeeAssetId = deps.assertGetChainAdapter(sellChainId)?.getFeeAssetId()
  const buyAssetFeeAsset = buyAssetFeeAssetId ? deps.assetsById[buyAssetFeeAssetId] : undefined
  if (!buyAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId: sellChainId },
      }),
    )
  }

  // TODO: use more than just UniswapV3, and also consider trianglar routes.
  const publicClient = viemClientByChainId[sellChainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${sellChainId}'`)

  const maybeBestAggregator = await getBestAggregator(
    buyAssetFeeAsset,
    getTokenFromAsset(sellAsset),
    getWrappedToken(buyAssetFeeAsset),
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  if (maybeBestAggregator.isErr()) {
    return Err(maybeBestAggregator.unwrapErr())
  }

  const { bestAggregator, quotedAmountOut } = maybeBestAggregator.unwrap()

  const l1Tol1QuoteInput: CommonTradeQuoteInput = {
    ...input,
    sellAsset: buyAssetFeeAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  // The sell side is asserted to be ethereum above, so these are always evm quotes
  const thorchainQuotes = await getL1RateOrQuote<ThorEvmTradeQuote>(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.LongTailToL1,
    swapperName,
  )

  // Paranoia - a zero expected amount out would likely lead to a loss of funds
  if (quotedAmountOut <= 0n) {
    return Err(
      makeSwapErrorRight({
        message: '[getLongtailToL1Quote] - expected a positive amount out',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  return thorchainQuotes.andThen(quotes => {
    const updatedQuotes = quotes.map(q => {
      const amountOutMin = BigInt(
        bnOrZero(quotedAmountOut.toString())
          .times(bn(1).minus(q.slippageTolerancePercentageDecimal ?? 0))
          .toFixed(0, BigNumber.ROUND_UP),
      )

      // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade
      assert(amountOutMin > 0n, 'expected amountOutMin to be a positive amount')

      // The deadline doubles as the THORChain deposit expiry, so it stays pinned to quote time rather
      // than being refreshed at execution - a stale quote reverts instead of executing on newer terms
      const deadline = BigInt(Math.floor(Date.now() / 1000)) + LONGTAIL_TO_L1_DEADLINE_SECONDS

      const data = swapIn({
        tcRouter: THOR_ROUTER_CONTRACT_MAINNET as Address,
        tcVault: q.vault as Address,
        tcMemo: q.memo,
        token: fromAssetId(sellAsset.assetId).assetReference as Address,
        amount: BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        amountOutMin,
        deadline,
      })

      return {
        ...q,
        aggregator: bestAggregator,
        // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
        steps: q.steps.map(s => ({
          ...s,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sellAsset,
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
          // Swap the direct deposit built by getL1RateOrQuote for the aggregator swapIn we actually execute
          transactionData:
            s.transactionData?.type === 'evm'
              ? { ...s.transactionData, to: bestAggregator, data, value: '0' }
              : s.transactionData,
        })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps
        isLongtail: true,
        longtailData: {
          longtailToL1ExpectedAmountOut: quotedAmountOut.toString(),
        },
      } satisfies ThorTradeQuote
    })

    return Ok(updatedQuotes)
  })
}
