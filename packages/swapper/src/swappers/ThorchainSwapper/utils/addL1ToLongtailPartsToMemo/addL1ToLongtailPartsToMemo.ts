import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { bchChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { isUtxoChainId, subtractBasisPointAmount } from '@shapeshiftoss/utils'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'

import {
  addAggregatorAddressToMemo,
  addFinalAssetAddressToMemo,
  addFinalAssetLimitToMemo,
  assertAndProcessMemo,
  MEMO_PART_DELIMITER,
} from '../../../../thorchain-utils'
import { getShortenedFinalAssetLimit } from '../getShortenedFinalAssetLimit/getShortenedFinalAssetLimit'
import { getUniqueAddressSubstring } from '../getUniqueAddressSubstring/getUniqueAddressSubstring'
import { shortenedNativeAssetNameByNativeAssetName } from '../longTailHelpers'

const BTC_MAXIMUM_BYTES_LENGTH = 80
const BCH_MAXIMUM_BYTES_LENGTH = 220

export const getMaxBytesLengthByChainId = (chainId: ChainId) => {
  if (chainId === bchChainId) return BCH_MAXIMUM_BYTES_LENGTH
  if (isUtxoChainId(chainId)) return BTC_MAXIMUM_BYTES_LENGTH
  return Infinity
}

export const addL1ToLongtailPartsToMemo = ({
  sellAssetChainId,
  quotedMemo,
  aggregator,
  finalAssetAssetId,
  finalAssetAmountOut,
  slippageBps,
  longtailTokens,
  affiliate: _affiliate,
}: {
  sellAssetChainId: ChainId
  slippageBps: BigNumber.Value
  quotedMemo: string
  aggregator: Address
  finalAssetAssetId: AssetId
  finalAssetAmountOut: string
  longtailTokens: AssetId[]
  affiliate: string
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
    affiliate: _affiliate,
  })

  assert(memoWithShortenedFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  return assertAndProcessMemo(memoWithShortenedFinalAssetAmountOut, _affiliate)
}
