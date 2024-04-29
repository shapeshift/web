import { bchChainId, type ChainId } from '@shapeshiftoss/caip'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { isUtxoChainId } from 'lib/utils/utxo'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { MEMO_PART_DELIMITER } from './constants'
import { poolToShortenedPool } from './longTailHelpers'

// Allows us to convert a THORChain parser value back to its base unit
// for testing purposes
export const thorchainParserToBaseUnit = (thorchainParserValue: string) => {
  if (thorchainParserValue.length < 3) {
    throw new Error('Number too short to contain an exponent.')
  }

  const exponent = parseInt(thorchainParserValue.slice(-2), 10)

  const baseNumber = thorchainParserValue.slice(0, -2)

  const fullNumber = toBaseUnit(baseNumber, exponent === 1 ? 0 : exponent)

  return fullNumber
}

export const addAggregatorAndDestinationToMemo = ({
  quotedMemo,
  aggregator,
  finalAssetAddress,
  minAmountOut,
  slippageBps,
  finalAssetPrecision,
  sellAssetChainId,
}: {
  slippageBps: BigNumber.Value
  quotedMemo: string | undefined
  aggregator: Address
  finalAssetAddress: Address
  minAmountOut: string
  finalAssetPrecision: number
  sellAssetChainId: ChainId
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  const maxMemoSize = (() => {
    if (sellAssetChainId === bchChainId) return 220
    if (isUtxoChainId(sellAssetChainId)) return 80
    return Infinity
  })()

  const [prefix, pool, address, nativeAssetLimitWithManualSlippage, affiliate, affiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)
  const shortenedPool = poolToShortenedPool[pool as keyof typeof poolToShortenedPool]
  assert(shortenedPool, 'cannot find shortened pool name')

  const aggregatorLastTwoChars = aggregator.slice(-2)
  const finalAssetAddressLastTwoChars = finalAssetAddress.slice(-2)

  let exponent = 0
  let formattedAmountOut = subtractBasisPointAmount(minAmountOut, slippageBps, BigNumber.ROUND_DOWN)

  let potentialMemo
  do {
    let amountWithExponent = formattedAmountOut
    if (exponent > 0) {
      amountWithExponent = fromBaseUnit(amountWithExponent, exponent)
      amountWithExponent = bn(amountWithExponent).integerValue(BigNumber.ROUND_DOWN).toFixed(0)
    } else {
      amountWithExponent = bn(formattedAmountOut).toFixed(0)
    }
    const amountOutStr =
      amountWithExponent + (exponent === 0 ? '01' : exponent < 10 ? `0${exponent}` : `${exponent}`)

    potentialMemo = [
      prefix,
      shortenedPool,
      address,
      nativeAssetLimitWithManualSlippage,
      affiliate,
      affiliateBps,
      aggregatorLastTwoChars,
      finalAssetAddressLastTwoChars,
      amountOutStr,
    ].join(MEMO_PART_DELIMITER)

    if (new Blob([potentialMemo]).size <= maxMemoSize) break
    exponent++
  } while (exponent < finalAssetPrecision)

  if (new Blob([potentialMemo]).size > maxMemoSize) {
    throw new Error('Unable to fit the memo within the size limit.')
  }

  return potentialMemo
}
