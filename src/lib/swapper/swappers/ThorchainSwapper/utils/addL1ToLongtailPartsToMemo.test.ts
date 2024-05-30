import { btcChainId, dogeChainId, ethChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { getMaxBytesLengthByChainId } from '../constants'
import { addL1ToLongtailPartsToMemo } from './addL1ToLongtailPartsToMemo'

const AGGREGATOR_ADDRESS = '0xd31f7e39afECEc4855fecc51b693F9A0Cec49fd2'
const BIG_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e'
const REALLY_BIG_ADDRESS =
  '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8Fb1bE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'

const FINAL_ASSET_CONTRACT_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'
const COLLIDING_FINAL_ASSET_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce36dF4741'

const FINAL_ASSETID = `eip155:1/erc20:${FINAL_ASSET_CONTRACT_ADDRESS}`
const COLLIDING_FINAL_ASSETID = `eip155:1/erc20:${COLLIDING_FINAL_ASSET_CONTRACT_ADDRESS}`

const THORCHAIN_ASSETIDS_ONE_COLLISION = [FINAL_ASSETID, COLLIDING_FINAL_ASSETID]

const slippageBps = 100 // 1%

describe('addL1ToLongtailPartsToMemo', () => {
  it('should add aggregator address, shortened destination address and finalAssetAmountOut correctly', () => {
    const finalAssetAmountOut = '9508759019'
    const quotedMemo = `=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:42:ss:100`

    const modifiedMemo = addL1ToLongtailPartsToMemo({
      sellChainId: ethChainId,
      quotedMemo,
      aggregator: AGGREGATOR_ADDRESS,
      finalAssetContractAssetId: FINAL_ASSET_CONTRACT_ADDRESS,
      finalAssetAmountOut,
      slippageBps,
      longtailTokens: THORCHAIN_ASSETIDS_ONE_COLLISION,
    })

    expect(modifiedMemo).toBe(
      // The aggregator will turn the finalAssetAmountOut from 941367142801 to 9413671428 using the last 2 bytes as exponents
      `=:e:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:42:ss:100:d2:a6df4741:941367142801`,
    )
  })

  it('should throw if chainId is BCH and memo length is > 220', () => {
    const finalAssetAmountOut = '2083854765519275828179229'
    const memoOver220Bytes = `=:ETH.ETH:${REALLY_BIG_ADDRESS}:42:ss:100`

    expect(memoOver220Bytes.length).toBe(221)

    expect(() =>
      addL1ToLongtailPartsToMemo({
        sellChainId: dogeChainId,
        quotedMemo: memoOver220Bytes,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetContractAssetId: FINAL_ASSET_CONTRACT_ADDRESS,
        finalAssetAmountOut,
        slippageBps,
        longtailTokens: THORCHAIN_ASSETIDS_ONE_COLLISION,
      }),
    ).toThrow('expected exponent to be 2 numbers')
  })

  it('should throw if chainId is BTC and memo length is > 80', () => {
    const finalAssetAmountOut = '2083854765519275828179229'
    const memoOver80Bytes = `=:ETH.ETH:${BIG_ADDRESS}:42:ss:100`

    expect(memoOver80Bytes.length).toBe(81)

    expect(() =>
      addL1ToLongtailPartsToMemo({
        sellChainId: btcChainId,
        quotedMemo: memoOver80Bytes,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetContractAssetId: FINAL_ASSET_CONTRACT_ADDRESS,
        finalAssetAmountOut,
        slippageBps,
        longtailTokens: THORCHAIN_ASSETIDS_ONE_COLLISION,
      }),
    ).toThrow(
      'positive final asset limit length should be at least 3 in memo: =:e:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e:42:ss:100:d2:a6df4741:35',
    )
  })

  it('should throw if chainId is DOGE and memo length is > 80', () => {
    const finalAssetAmountOut = '2083854765519275828179229'
    const memoOver80Bytes = `=:ETH.ETH:${BIG_ADDRESS}:42:ss:100`

    expect(memoOver80Bytes.length).toBe(81)
    expect(() =>
      addL1ToLongtailPartsToMemo({
        sellChainId: dogeChainId,
        quotedMemo: memoOver80Bytes,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetContractAssetId: FINAL_ASSET_CONTRACT_ADDRESS,
        finalAssetAmountOut,
        slippageBps,
        longtailTokens: THORCHAIN_ASSETIDS_ONE_COLLISION,
      }),
    ).toThrow(
      'positive final asset limit length should be at least 3 in memo: =:e:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e:42:ss:100:d2:a6df4741:35',
    )
  })

  it('should be successful if chainId is DOGE and memo length is < 80', () => {
    const finalAssetAmountOut = '2083854765519275828179229'
    const quotedMemo = `=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:42:ss:100`

    const modifiedMemo = addL1ToLongtailPartsToMemo({
      sellChainId: dogeChainId,
      quotedMemo,
      aggregator: AGGREGATOR_ADDRESS,
      finalAssetContractAssetId: FINAL_ASSET_CONTRACT_ADDRESS,
      finalAssetAmountOut,
      slippageBps,
      longtailTokens: THORCHAIN_ASSETIDS_ONE_COLLISION,
    })

    expect(modifiedMemo.length).toBeLessThanOrEqual(getMaxBytesLengthByChainId(dogeChainId))

    expect(modifiedMemo).toBe(
      // The aggregator will turn the finalAssetAmountOut from 20630162116 to 2063016210000000000000000 using the last 2 bytes as exponents
      `=:e:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:42:ss:100:d2:a6df4741:20630162116`,
    )
  })
})
