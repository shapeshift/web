import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { getMaxBytesLengthByChainId } from '../constants'
import { MEMO_PART_DELIMITER } from './constants'
import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'
import { shortenedNativeAssetNameByNativeAssetName } from './longTailHelpers'
import { makeMemoWithShortenedFinalAssetAmount } from './makeMemoWithShortenedFinalAssetAmount'

export const addL1ToLongtailPartsToMemo = ({
  sellAssetChainId,
  quotedMemo,
  aggregator,
  finalAssetAssetId,
  finalAssetAmountOut,
  slippageBps,
  longtailTokens,
}: {
  sellAssetChainId: ChainId
  slippageBps: BigNumber.Value
  quotedMemo: string
  aggregator: Address
  finalAssetAssetId: AssetId
  finalAssetAmountOut: string
  longtailTokens: AssetId[]
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  const [
    prefix,
    nativeAssetName,
    address,
    nativeAssetLimitWithManualSlippage,
    affiliate,
    affiliateBps,
  ] = quotedMemo.split(MEMO_PART_DELIMITER)

  const maxMemoSize = getMaxBytesLengthByChainId(sellAssetChainId)

  // Paranonia - If memo without final asset amount out and aggregator is already too long, we can't do anything
  assert(quotedMemo.length <= maxMemoSize, 'memo is too long')

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(finalAssetAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const finalAssetContractAddressShortened = getUniqueAddressSubstring(
    finalAssetAssetId,
    longtailTokens,
  )

  // THORChain themselves use 2 characters but it might collide at some point in the future (https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/aggregators/dex_mainnet_current.go)
  const aggregatorLastTwoChars = aggregator.slice(aggregator.length - 2, aggregator.length)

  const shortenedNativeAssetName =
    shortenedNativeAssetNameByNativeAssetName[
      nativeAssetName as keyof typeof shortenedNativeAssetNameByNativeAssetName
    ]

  assert(shortenedNativeAssetName, 'cannot find shortened native asset name')

  const memoWithoutFinalAssetAmountOut = [
    prefix,
    shortenedNativeAssetName,
    address,
    nativeAssetLimitWithManualSlippage,
    affiliate,
    affiliateBps,
    aggregatorLastTwoChars,
    finalAssetContractAddressShortened,
  ].join(MEMO_PART_DELIMITER)

  // Paranonia - If memo without final asset amount out is already too long, we can't do anything
  assert(memoWithoutFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  const memoWithShortenedFinalAssetAmountOut = makeMemoWithShortenedFinalAssetAmount({
    maxMemoSize,
    memoWithoutFinalAssetAmountOut,
    finalAssetLimitWithManualSlippage,
  })

  assert(memoWithShortenedFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  return assertAndProcessMemo(memoWithShortenedFinalAssetAmountOut)
}
