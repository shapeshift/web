import { describe, expect, it } from 'vitest'

import { makeMemoWithShortenedFinalAssetAmount } from './makeMemoWithShortenedFinalAssetAmount'

const RECEIVE_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
// 178 bytes
const BIG_ADDRESS =
  '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbC2ecF05Ed86Ca3096cF05Ed86Ca3096Cb60x32DBc9Cf9E8FbCebE1e0a2a3096C2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
// 354 bytes
const REALLY_BIG_ADDRESS =
  '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbC2ecF05Ed86Ca3096cF05Ed86Ca3096Cb60x32DBc9Cf9E8FbCebE1e0a2a3096C2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbC2ecF05Ed86Ca3096cF05Ed86Ca3096Cb60x32DBc9Cf9E8FbCebE1e0a2a3096C2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
const EXPECTED_AGGREGATOR_TWO_LAST_CHARS = 'd2'

const SHORTENED_FINAL_ASSET_ADDRESS = 'a6df4741'

const affiliateBps = '100'
const expectedL1AmountOut = '42'

describe('makeMemoWithShortenedFinalAssetAmount', () => {
  it('should be 80 bytes if maxMemoSize is 80', () => {
    const quotedMemo = `=:e:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: 80,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '950875902132134123',
    })

    expect(modifiedMemo.length).toBe(80)
    expect(modifiedMemo).toBe(
      // 95087590209 will be turned to 950875902000000000 using the last 2 bytes as exponents by the aggregator
      `=:e:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}:95087590209`,
    )
  })

  it('shortened final asset amount length should be shortened by one if maxMemoSize is Infinity and final asset amount length is under or equal to 17', () => {
    // Equals to 987,234,879,539,239,282.982983248234982348 ETH
    const reallyL1BigAmount = '987234879539239282982983248234982348'
    const quotedMemo = `=:e:${RECEIVE_ADDRESS}:${reallyL1BigAmount}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: Infinity,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '95087590213213412',
    })

    // 950875902132134101 will be turned to 95087590213213410 using the last 2 bytes as exponents by the aggregator
    const expectedMemo = `=:e:${RECEIVE_ADDRESS}:${reallyL1BigAmount}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}:950875902132134101`

    expect(modifiedMemo).toBe(expectedMemo)
  })

  it('shortened final asset amount should be shortened by 1 if maxMemoSize is Infinity and final asset amount length equal to 18', () => {
    // Equals to 987,234,879,539,239,282.982983248234982348 ETH
    const reallyL1BigAmount = '987234879539239282982983248234982348'
    const quotedMemo = `=:e:${RECEIVE_ADDRESS}:${reallyL1BigAmount}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: Infinity,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '950875902132134122',
    })

    // 9508759021321341201 will be turned to 950875902132134120 using the last 2 bytes as exponents by the aggregator
    const expectedMemo = `=:e:${RECEIVE_ADDRESS}:${reallyL1BigAmount}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}:9508759021321341201`

    expect(modifiedMemo).toBe(expectedMemo)
  })

  it('shortened final asset amount should be shortened by 2 if maxMemoSize is Infinity and final asset amount length equal to 19', () => {
    // Equals to 987,234,879,539,239,282.982983248234982348 ETH
    const reallyL1BigAmount = '987234879539239282982983248234982348'
    const quotedMemo = `=:e:${RECEIVE_ADDRESS}:${reallyL1BigAmount}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: Infinity,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '9508759021321341223',
    })

    // 9508759021321341202 will be turned to 9508759021321341200 using the last 2 bytes as exponents by the aggregator
    const expectedMemo = `=:e:${RECEIVE_ADDRESS}:${reallyL1BigAmount}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}:9508759021321341202`

    expect(modifiedMemo).toBe(expectedMemo)
  })

  it('should be under or equal to 220 bytes if maxMemoSize is 220 and memo length is close to 220', () => {
    // 205 bytes
    const quotedMemo = `=:e:${BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}`

    const modifiedMemo = makeMemoWithShortenedFinalAssetAmount({
      maxMemoSize: 220,
      memoWithoutFinalAssetAmountOut: quotedMemo,
      finalAssetLimitWithManualSlippage: '950875902132134123',
    })

    expect(modifiedMemo.length).toBeLessThanOrEqual(220)
    expect(modifiedMemo).toBe(
      // 950875902132105 will be turned to 950875902132100000 using the last 2 bytes as exponents by the aggregator
      `=:e:${BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}:950875902132105`,
    )
  })

  it('should be throwing if length cant be achieved because exponent will be bigger than expected', () => {
    const quotedMemo = `=:e:${REALLY_BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${EXPECTED_AGGREGATOR_TWO_LAST_CHARS}:${SHORTENED_FINAL_ASSET_ADDRESS}`

    expect(() =>
      makeMemoWithShortenedFinalAssetAmount({
        maxMemoSize: 220,
        memoWithoutFinalAssetAmountOut: quotedMemo,
        finalAssetLimitWithManualSlippage: '950875902132134123',
      }),
    ).toThrow('min amount chars length should be 3 or more')
  })
})
