import { type AssetId, type ChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { subtractBasisPointAmount } from '@shapeshiftoss/utils'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'

import { assertAndProcessMemo } from '../../../thorchain-utils'
import { addAggregatorAddressToMemo } from '../../../thorchain-utils/memo/addAggregatorAddressToMemo'
import { addFinalAssetAddressToMemo } from '../../../thorchain-utils/memo/addFinalAssetAddressToMemo'
import { addFinalAssetLimitToMemo } from '../../../thorchain-utils/memo/addFinalAssetLimitToMemo'
import { getMaxBytesLengthByChainId } from '../constants'
import { MEMO_PART_DELIMITER } from './constants'
import { getShortenedFinalAssetLimit } from './getShortenedFinalAssetLimit'
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

  // THORChain themselves use 2 characters but it might collide at some point in the future (https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/aggregators/dex_mainnet_current.go)
  const shortenedAggregatorAddress = aggregator.slice(aggregator.length - 2, aggregator.length)

  const quotedMemoWithAggregator = addAggregatorAddressToMemo({
    memo: quotedMemo,
    aggregatorAddress: shortenedAggregatorAddress,
  })

  const finalAssetContractAddressShortened = getUniqueAddressSubstring(
    finalAssetAssetId,
    longtailTokens,
  )

  const quotedMemoWithAggregatorAndFinalAssetContract = addFinalAssetAddressToMemo({
    memo: quotedMemoWithAggregator,
    finalAssetAddress: finalAssetContractAddressShortened,
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

  const memoWithoutFinalAssetLimit = [
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
  assert(memoWithoutFinalAssetLimit.length <= maxMemoSize, 'memo is too long')

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(finalAssetAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const shortenedFinalAssetAmount = getShortenedFinalAssetLimit({
    maxMemoSize,
    memoWithoutFinalAssetLimit,
    finalAssetLimitWithManualSlippage,
  })

  const memoWithShortenedFinalAssetAmountOut = addFinalAssetLimitToMemo({
    memo: memoWithoutFinalAssetLimit,
    finalAssetLimit: shortenedFinalAssetAmount,
  })

  assert(memoWithShortenedFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  return assertAndProcessMemo(memoWithShortenedFinalAssetAmountOut)
}
