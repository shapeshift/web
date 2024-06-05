import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { getMaxBytesLengthByChainId } from '../constants'
import { MEMO_PART_DELIMITER } from './constants'
import { getShortenedAssetName } from './getShortenedAssetName'
import { getUniqueAddressSubstring } from './getUniqueAddressSubstring'
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

  const [action, asset, destAddr, limit, affiliate, affiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const maxMemoSize = getMaxBytesLengthByChainId(sellAssetChainId)

  // Paranonia - If memo without final asset amount out and aggregator is already too long, we can't do anything
  assert(quotedMemo.length <= maxMemoSize, 'memo is too long')

  const finalAssetMinAmountOut = subtractBasisPointAmount(
    bn(finalAssetAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const finalAssetAddress = getUniqueAddressSubstring(
    fromAssetId(finalAssetAssetId).assetReference,
    longtailTokens,
  )

  // THORChain themselves use 2 characters but it might collide at some point in the future
  // (https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/aggregators/dex_mainnet_current.go)
  const shortenedAggregatorAddress = aggregator.slice(-2)

  const memoWithoutMinAmountOut = [
    action,
    getShortenedAssetName(asset ?? ''),
    destAddr,
    limit,
    affiliate,
    affiliateBps,
    shortenedAggregatorAddress,
    finalAssetAddress,
  ].join(MEMO_PART_DELIMITER)

  // Paranonia - If memo without final asset amount out is already too long, we can't do anything
  assert(memoWithoutMinAmountOut.length <= maxMemoSize, 'memo is too long')

  const memoWithShortenedFinalAssetAmountOut = makeMemoWithShortenedFinalAssetAmount({
    maxMemoSize,
    memoWithoutMinAmountOut,
    finalAssetMinAmountOut,
  })

  assert(memoWithShortenedFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')

  return assertAndProcessMemo(memoWithShortenedFinalAssetAmountOut)
}
