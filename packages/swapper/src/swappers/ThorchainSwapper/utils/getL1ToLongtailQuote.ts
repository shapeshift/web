import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import {
  convertDecimalPercentageToBasisPoints,
  isFulfilled,
  isRejected,
  isResolvedErr,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getAddress, zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { ThorEvmTradeQuote, ThorTradeQuote } from '../../../thorchain-utils'
import {
  depositWithExpiry,
  getAffiliate,
  getL1RateOrQuote,
  TradeType,
} from '../../../thorchain-utils'
import type {
  CommonTradeQuoteInput,
  MultiHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getHopByIndex, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { addL1ToLongtailPartsToMemo } from './addL1ToLongtailPartsToMemo/addL1ToLongtailPartsToMemo'
import { getBestAggregator } from './getBestAggregator'
import type { AggregatorContract } from './longTailHelpers'
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

// This just uses UniswapV3 to get the longtail quote for now.
export const getL1ToLongtailQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  streamingInterval: number,
  swapperName: SwapperName,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    sellAsset,
    slippageTolerancePercentageDecimal,
  } = input

  const longtailTokensJson = await import('../generated/generatedThorLongtailTokens.json')
  const longtailTokens: AssetId[] = longtailTokensJson.default

  if (!longtailTokens.includes(buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported buyAssetId ${buyAsset.assetId}.`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  /*
    We only support L1 -> ethereum longtail swaps for now.
  */
  if (buyAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${buyAsset.chainId}.`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAssetChainId: buyAsset.chainId },
      }),
    )
  }

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  const sellAssetFeeAssetId = deps.assertGetChainAdapter(sellAssetChainId).getFeeAssetId()
  const sellAssetFeeAsset = sellAssetFeeAssetId ? deps.assetsById[sellAssetFeeAssetId] : undefined

  const buyAssetFeeAssetId = deps.assertGetChainAdapter(buyAssetChainId).getFeeAssetId()
  const buyAssetFeeAsset = buyAssetFeeAssetId ? deps.assetsById[buyAssetFeeAssetId] : undefined

  if (!buyAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${buyAssetChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { buyAssetChainId },
      }),
    )
  }

  if (!sellAssetFeeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellAssetChainId}.`,
        code: TradeQuoteError.InternalError,
        details: { sellAssetChainId },
      }),
    )
  }

  const l1Tol1QuoteInput: CommonTradeQuoteInput = {
    ...input,
    buyAsset: buyAssetFeeAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  }

  const maybeThorchainQuotes = await getL1RateOrQuote<ThorTradeQuote>(
    l1Tol1QuoteInput,
    deps,
    streamingInterval,
    TradeType.L1ToLongTail,
    swapperName,
  )

  if (maybeThorchainQuotes.isErr()) return Err(maybeThorchainQuotes.unwrapErr())

  const thorchainQuotes = maybeThorchainQuotes.unwrap()

  let bestAggregator: AggregatorContract
  let quotedAmountOut: bigint

  const promises = await Promise.allSettled(
    thorchainQuotes.map(async quote => {
      // A quote always has a first step
      const onlyStep = getHopByIndex(quote, 0)

      // Or well... it should.
      if (!onlyStep) {
        return Err(
          makeSwapErrorRight({
            message: `[getL1ToLongtailQuote] - First hop not found`,
            code: TradeQuoteError.InternalError,
          }),
        )
      }

      const maybeBestAggregator = await getBestAggregator(
        buyAssetFeeAsset,
        getWrappedToken(buyAssetFeeAsset),
        getTokenFromAsset(buyAsset),
        onlyStep.buyAmountAfterFeesCryptoBaseUnit,
      )

      if (maybeBestAggregator.isErr()) return Err(maybeBestAggregator.unwrapErr())

      const unwrappedResult = maybeBestAggregator.unwrap()

      bestAggregator = unwrappedResult.bestAggregator
      quotedAmountOut = unwrappedResult.quotedAmountOut

      // Paranoia - a zero expected amount out would likely lead to a loss of funds, and is encoded into
      // the memo below as well as the calldata
      if (quotedAmountOut <= 0n) {
        return Err(
          makeSwapErrorRight({
            message: '[getL1ToLongtailQuote] - expected a positive amount out',
            code: TradeQuoteError.InternalError,
          }),
        )
      }

      const updatedMemo = addL1ToLongtailPartsToMemo({
        sellAssetChainId,
        aggregator: bestAggregator,
        finalAssetAssetId: buyAsset.assetId,
        finalAssetAmountOut: quotedAmountOut.toString(),
        slippageBps: convertDecimalPercentageToBasisPoints(
          slippageTolerancePercentageDecimal ??
            getDefaultSlippageDecimalPercentageForSwapper(swapperName),
        ).toString(),
        quotedMemo: quote.memo,
        longtailTokens,
        affiliate: getAffiliate(swapperName),
      })

      // getL1RateOrQuote built its calldata against the pre-aggregator memo, so re-encode the deposit
      // now that the final memo is known. Only applies to evm sell assets - a utxo or cosmos sell side
      // carries a memo rather than calldata, and needs nothing here.
      const data = isEvmChainId(sellAsset.chainId)
        ? depositWithExpiry({
            vault: getAddress((quote as ThorEvmTradeQuote).vault),
            asset: isNativeEvmAsset(sellAsset.assetId)
              ? zeroAddress
              : getAddress(fromAssetId(sellAsset.assetId).assetReference),
            amount: BigInt(onlyStep.sellAmountIncludingProtocolFeesCryptoBaseUnit),
            memo: updatedMemo,
            expiry: BigInt(quote.expiry),
          })
        : undefined

      return Ok({
        ...quote,
        memo: updatedMemo,
        data,
        aggregator: bestAggregator,
        steps: quote.steps.map(s => ({
          ...s,
          buyAsset,
          buyAmountAfterFeesCryptoBaseUnit: quotedAmountOut.toString(),
          // This is wrong, we should get the get the value before fees or display ETH value received after the thorchain bridge
          buyAmountBeforeFeesCryptoBaseUnit: quotedAmountOut.toString(),
          allowanceContract: TS_AGGREGATOR_TOKEN_TRANSFER_PROXY_CONTRACT_MAINNET,
          transactionData:
            data && s.transactionData?.type === 'evm'
              ? { ...s.transactionData, data }
              : s.transactionData,
        })) as MultiHopTradeQuoteSteps, // assuming multi-hop quote steps here since we're mapping over quote steps,
        isLongtail: true,
        longtailData: {
          L1ToLongtailExpectedAmountOut: quotedAmountOut.toString(),
        },
      })
    }),
  )

  if (promises.every(promise => isRejected(promise) || isResolvedErr(promise))) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote] - failed to get best aggregator',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const updatedQuotes = promises.filter(isFulfilled).map(element => element.value.unwrap())

  return Ok(updatedQuotes)
}
