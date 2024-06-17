import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'
import { addAggregatorAddressToMemo } from 'lib/utils/thorchain/memo/addAggregatorAddressToMemo'
import { addFinalAssetContractToMemo } from 'lib/utils/thorchain/memo/addFinalAssetContractToMemo'
import { addFinalAssetLimitToMemo } from 'lib/utils/thorchain/memo/addFinalAssetLimitToMemo'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { getMaxBytesLengthByChainId } from '../constants'
import { MEMO_PART_DELIMITER } from './constants'
import { getShortenedFinalAssetAmount } from './getShortenedFinalAssetAmount'
import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'
import { shortenedNativeAssetNameByNativeAssetName } from './longTailHelpers'

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

  const maxMemoSize = getMaxBytesLengthByChainId(sellAssetChainId)

  // Paranonia - If memo without final asset amount out and aggregator is already too long, we can't do anything
  assert(quotedMemo.length <= maxMemoSize, 'memo is too long')

  const shortenedAggregatorAddress = aggregator.slice(aggregator.length - 2, aggregator.length)

  const quotedMemoWithAggregator = addAggregatorAddressToMemo({
    memo: quotedMemo,
    aggregatorAddress: shortenedAggregatorAddress,
  })

  const finalAssetContractAddressShortened = getUniqueAddressSubstring(
    finalAssetAssetId,
    longtailTokens,
  )

  const quotedMemoWithAggregatorAndFinalAssetContract = addFinalAssetContractToMemo({
    memo: quotedMemoWithAggregator,
    finalAssetContract: finalAssetContractAddressShortened,
  })

  const [
    prefix,
    nativeAssetName,
    address,
    nativeAssetLimitWithManualSlippage,
    affiliate,
    affiliateBps,
    aggregatorLastTwoChars,
    finalAssetContract,
  ] = quotedMemoWithAggregatorAndFinalAssetContract.split(MEMO_PART_DELIMITER)

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
    finalAssetContract,
  ].join(MEMO_PART_DELIMITER)

  // Paranonia - If memo without final asset amount out is already too long, we can't do anything
  assert(memoWithoutFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(finalAssetAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const shortenedFinalAssetAmount = getShortenedFinalAssetAmount({
    maxMemoSize,
    memoWithoutFinalAssetAmountOut,
    finalAssetLimitWithManualSlippage,
  })

  const memoWithShortenedFinalAssetAmountOut = addFinalAssetLimitToMemo({
    memo: memoWithoutFinalAssetAmountOut,
    finalAssetAmountOut: shortenedFinalAssetAmount,
  })

  assert(memoWithShortenedFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  console.log(memoWithShortenedFinalAssetAmountOut)

  return assertAndProcessMemo(memoWithShortenedFinalAssetAmountOut)
}
