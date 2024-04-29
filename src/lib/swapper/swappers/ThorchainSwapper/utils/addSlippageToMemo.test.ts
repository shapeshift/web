import { describe, expect, it } from 'vitest'

import { addSlippageToMemo } from './addSlippageToMemo'
import { MEMO_PART_DELIMITER } from './constants'

const RECEIVE_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'

describe('addSlippageToMemo', () => {
  it('should add slippage to memo correctly', () => {
    const affiliateBps = '100'
    const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}::ss:${affiliateBps}`
    const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
    const expectedL1AmountOutMinusSlippage = '41'

    const slippageBps = 100 // 1%
    const chainId = 'eip155:1'
    const isStreaming = false

    const modifiedMemo = addSlippageToMemo({
      expectedAmountOutThorBaseUnit: expectedL1AmountOut,
      quotedMemo,
      slippageBps,
      isStreaming,
      chainId,
      affiliateBps,
    })

    expect(modifiedMemo).toBe(
      `=${MEMO_PART_DELIMITER}ETH.ETH${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOutMinusSlippage}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}`,
    )
  })
})
