import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { bchChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'
import { isUtxoChainId } from 'lib/utils/utxo'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { BCH_MAXIMUM_BYTES_LENGTH, UTXO_MAXIMUM_BYTES_LENGTH } from '../constants'
import { MEMO_PART_DELIMITER } from './constants'
import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'
import { shortenedNativeAssetNameByNativeAssetName } from './longTailHelpers'
import { makeMemoWithShortenedFinalAssetAmount } from './makeMemoWithShortenedFinalAssetAmount'

export const addAggregatorAndDestinationToMemo = ({
  sellChainId,
  quotedMemo,
  aggregator,
  finalAssetAddress,
  minAmountOut,
  slippageBps,
  longtailTokens,
}: {
  sellChainId: ChainId
  slippageBps: BigNumber.Value
  quotedMemo: string | undefined
  aggregator: Address
  finalAssetAddress: Address
  minAmountOut: string
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

  const maxMemoSize = (() => {
    if (sellChainId === bchChainId) return BCH_MAXIMUM_BYTES_LENGTH
    if (isUtxoChainId(sellChainId)) return UTXO_MAXIMUM_BYTES_LENGTH
    return Infinity
  })()

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(minAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const finalAssetAddressShortened = getUniqueAddressSubstring(finalAssetAddress, longtailTokens)

  // THORChain themselves uses 2 characters but it might collide at some points in the future (https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/aggregators/dex_mainnet_current.go)
  const aggregatorLastTwoChars = aggregator.slice(aggregator.length - 2, aggregator.length)

  const shortenedNativeAssetName =
    shortenedNativeAssetNameByNativeAssetName[
      nativeAssetName as keyof typeof shortenedNativeAssetNameByNativeAssetName
    ]

  assert(shortenedNativeAssetName, 'cannot find shortened native asset name')

  const memoWithoutMinAmountOut = [
    prefix,
    shortenedNativeAssetName,
    address,
    nativeAssetLimitWithManualSlippage,
    affiliate,
    affiliateBps,
    aggregatorLastTwoChars,
    finalAssetAddressShortened,
  ].join(MEMO_PART_DELIMITER)

  const memoWithShortenedMinAmountOut = makeMemoWithShortenedFinalAssetAmount({
    maxMemoSize,
    memoWithoutMinAmountOut,
    finalAssetLimitWithManualSlippage,
  })

  assert(memoWithShortenedMinAmountOut.length <= maxMemoSize, 'memo is too long')
  console.log(memoWithShortenedMinAmountOut)

  return assertAndProcessMemo(memoWithShortenedMinAmountOut)
}
