import { describe, expect, it } from 'vitest'

import { addAggregatorAndDestinationToMemo } from './addAggregatorAndDestinationToMemo'
import { MEMO_PART_DELIMITER } from './constants'

const RECEIVE_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
const AGGREGATOR_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'
const FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'

describe('addAggregatorAndDestinationToMemo', () => {
  it('should add aggregator address, destination address and minAmountOut correctly', () => {
    const minAmountOut = '100'
    const affiliateBps = '100'
    const finalExpectedAmountOut = '99000000'
    const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}:${finalExpectedAmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:10`

    const slippageBps = 100 // 1%

    const modifiedMemo = addAggregatorAndDestinationToMemo({
      quotedMemo,
      aggregator: AGGREGATOR_ADDRESS,
      finalAssetAddress: FINAL_ASSET_ADDRESS,
      minAmountOut,
    })

    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}ETH.ETH${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${finalExpectedAmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${slippageBps}${MEMO_PART_DELIMITER}${AGGREGATOR_ADDRESS}${MEMO_PART_DELIMITER}${FINAL_ASSET_ADDRESS}${MEMO_PART_DELIMITER}${minAmountOut}`,
    )
  })
})
