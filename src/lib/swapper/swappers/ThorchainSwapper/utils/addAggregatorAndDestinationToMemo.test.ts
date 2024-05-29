import { btcChainId, dogeChainId, ethChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { UTXO_MAXIMUM_BYTES_LENGTH } from '../constants'
import { addAggregatorAndDestinationToMemo } from './addAggregatorAndDestinationToMemo'
import { MEMO_PART_DELIMITER } from './constants'

const RECEIVE_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
const AGGREGATOR_ADDRESS = '0xd31f7e39afECEc4855fecc51b693F9A0Cec49fd2'
const AGGREGATOR_TWO_LAST_CHARS = 'd2'
const REALLY_BIG_ADDRESS =
  '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb632DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'

const FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'
const SHORTENED_FINAL_ASSET_ADDRESS = 'a6df4741'

const COLLIDING_FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132i6dF4741'

const FINAL_ASSETID = `eip155:1/erc20:${FINAL_ASSET_ADDRESS}`
const COLLIDING_FINAL_ASSETID = `eip155:1/erc20:${COLLIDING_FINAL_ASSET_ADDRESS}`

const DEFAULT_THORCHAIN_ASSETS_LIST = [FINAL_ASSETID, COLLIDING_FINAL_ASSETID]

const affiliateBps = '100'
const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
const slippageBps = 100 // 1%

describe('addAggregatorAndDestinationToMemo', () => {
  it('should add aggregator address, shortened destination address and minAmountOut correctly', () => {
    const minAmountOut = '9508759019'
    const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}`

    const modifiedMemo = addAggregatorAndDestinationToMemo({
      sellChainId: ethChainId,
      quotedMemo,
      aggregator: AGGREGATOR_ADDRESS,
      finalAssetAddress: FINAL_ASSET_ADDRESS,
      minAmountOut,
      slippageBps,
      longtailTokens: DEFAULT_THORCHAIN_ASSETS_LIST,
    })

    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${SHORTENED_FINAL_ASSET_ADDRESS}${MEMO_PART_DELIMITER}941367142801`,
    )
  })

  it('should throw if chainId is BCH and bytes length is > 220', () => {
    const minAmountOut = '2083854765519275828179229'
    const memoOver220Bytes = `=:ETH.ETH:${REALLY_BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}`

    expect(() =>
      addAggregatorAndDestinationToMemo({
        sellChainId: dogeChainId,
        quotedMemo: memoOver220Bytes,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        longtailTokens: DEFAULT_THORCHAIN_ASSETS_LIST,
      }),
    ).toThrow()
  })

  it('should throw if chainId is BTC and bytes length is > 80', () => {
    const minAmountOut = '2083854765519275828179229'
    const memo = `=:ETH.ETH:${REALLY_BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}`

    expect(() =>
      addAggregatorAndDestinationToMemo({
        sellChainId: btcChainId,
        quotedMemo: memo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        longtailTokens: DEFAULT_THORCHAIN_ASSETS_LIST,
      }),
    ).toThrow()
  })

  it('should throw if chainId is DOGE and bytes length is > 80', () => {
    const minAmountOut = '2083854765519275828179229'
    const memoOver80Bytes = `=:ETH.ETH:${REALLY_BIG_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}`

    expect(() =>
      addAggregatorAndDestinationToMemo({
        sellChainId: dogeChainId,
        quotedMemo: memoOver80Bytes,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        longtailTokens: DEFAULT_THORCHAIN_ASSETS_LIST,
      }),
    ).toThrow()
  })

  it('should be successful if chainId is DOGE and bytes length is > 80', () => {
    const minAmountOut = '2083854765519275828179229'
    const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}`

    const modifiedMemo = addAggregatorAndDestinationToMemo({
      sellChainId: dogeChainId,
      quotedMemo,
      aggregator: AGGREGATOR_ADDRESS,
      finalAssetAddress: FINAL_ASSET_ADDRESS,
      minAmountOut,
      slippageBps,
      longtailTokens: DEFAULT_THORCHAIN_ASSETS_LIST,
    })

    expect(modifiedMemo.length).toBeLessThanOrEqual(UTXO_MAXIMUM_BYTES_LENGTH)

    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${SHORTENED_FINAL_ASSET_ADDRESS}${MEMO_PART_DELIMITER}20630162116`,
    )
  })
})
