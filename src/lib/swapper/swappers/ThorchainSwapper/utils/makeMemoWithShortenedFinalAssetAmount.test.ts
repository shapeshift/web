import { describe, expect, it } from 'vitest'

import { MEMO_PART_DELIMITER } from './constants'
import { makeMemoWithShortenedFinalAssetAmount } from './makeMemoWithShortenedFinalAssetAmount'

const RECEIVE_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
// 178 bytes
const BIG_ADDRESS =
  '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbC2ecF05Ed86Ca3096cF05Ed86Ca3096Cb60x32DBc9Cf9E8FbCebE1e0a2a3096C2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
// 354 bytes
const REALLY_BIG_ADDRESS =
  '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbC2ecF05Ed86Ca3096cF05Ed86Ca3096Cb60x32DBc9Cf9E8FbCebE1e0a2a3096C2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbC2ecF05Ed86Ca3096cF05Ed86Ca3096Cb60x32DBc9Cf9E8FbCebE1e0a2a3096C2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
const EXPECTED_AGGREGATOR_TWO_LAST_CHARS = 'd2'

const SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS = 'a6df4741'

const affiliateBps = '100'
const expectedL1AmountOut = '42'

describe('makeMemoWithShortenedFinalAssetAmount', () => {
  it('should be 80 bytes if maxMemoSize is 80', () => {
    const quotedMemo = `=:e:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: 80,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '950875902132134123',
    })

    expect(modifiedMemo.length).toBe(80)
    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}${MEMO_PART_DELIMITER}95087590209`,
    )
  })

  it('should be any bytes if maxMemoSize is Infinity', () => {
    const quotedMemo = `=:e:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: Infinity,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '950875902132134123',
    })

    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}${MEMO_PART_DELIMITER}9508759021321341201`,
    )
  })

  it('should be under 220 bytes if maxMemoSize is 220 and memo length is close to 220', () => {
    // 210 bytes
    const quotedMemo = `=:e:${BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: 220,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '950875902132134123',
    })

    expect(modifiedMemo.length).toBeLessThanOrEqual(220)
    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${BIG_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}${MEMO_PART_DELIMITER}950875902132105`,
    )
  })

  it('should be throwing if length cant be achieved', () => {
    const quotedMemo = `=:e:${REALLY_BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_CONTRACT_ADDRESS}`

    expect(() =>
      makeMemoWithShortenedFinalAssetAmount({
        maxMemoSize: 220,
        memoWithoutFinalAssetAmountOut: quotedMemo,
        finalAssetLimitWithManualSlippage: '950875902132134123',
      }),
    ).toThrow()
  })
})
