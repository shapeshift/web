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
  sellChainId,
  quotedMemo,
  aggregator,
  finalAssetContractAssetId,
  finalAssetAmountOut,
  slippageBps,
  longtailTokens,
}: {
  sellChainId: ChainId
  slippageBps: BigNumber.Value
  quotedMemo: string | undefined
  aggregator: Address
  finalAssetContractAssetId: AssetId
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

  const maxMemoSize = getMaxBytesLengthByChainId(sellChainId)

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(finalAssetAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const finalAssetContractAddressShortened = getUniqueAddressSubstring(
    finalAssetContractAssetId,
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

  const memoWithShortenedFinalAssetAmountOut = makeMemoWithShortenedFinalAssetAmount({
    maxMemoSize,
    memoWithoutFinalAssetAmountOut,
    finalAssetLimitWithManualSlippage,
  })

  assert(memoWithShortenedFinalAssetAmountOut.length <= maxMemoSize, 'memo is too long')
  console.log(memoWithShortenedFinalAssetAmountOut)

  return assertAndProcessMemo(memoWithShortenedFinalAssetAmountOut)
}
