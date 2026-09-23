import type { SwapperDeps, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApprovalInfo } from './utils'

const getTrc20Allowance = vi.fn()
const estimateContractCallFee = vi.fn()

const deps = {
  assertGetTronChainAdapter: () => ({
    httpProvider: { getTrc20Allowance, estimateContractCallFee },
  }),
} as unknown as SwapperDeps

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const OWNER = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
const SPENDER = 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K'
// approve(address,uint256)
const APPROVE_SELECTOR = '0x095ea7b3'

const usdtStep = {
  sellAsset: { chainId: 'tron:0x2b6653dc', assetId: `tron:0x2b6653dc/trc20:${USDT}` },
  allowanceContract: SPENDER,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: '100000000',
} as unknown as TradeQuoteStep

describe('buildApprovalInfo tron', () => {
  beforeEach(() => {
    getTrc20Allowance.mockReset()
    estimateContractCallFee.mockReset()
  })

  it('needs no approval when the allowance covers the amount', async () => {
    getTrc20Allowance.mockResolvedValue('100000000')

    expect(await buildApprovalInfo(usdtStep, OWNER, deps)).toEqual({
      isRequired: false,
      spender: SPENDER,
      approvalTxs: [],
    })
    expect(getTrc20Allowance).toHaveBeenCalledWith({
      contractAddress: USDT,
      owner: OWNER,
      spender: SPENDER,
    })
  })

  it('builds an exact approve call to the token when the allowance is zero', async () => {
    getTrc20Allowance.mockResolvedValue('0')

    const actual = await buildApprovalInfo(usdtStep, OWNER, deps)

    expect(actual.isRequired).toBe(true)
    expect(actual.approvalTxs).toHaveLength(1)
    expect(actual.approvalTxs[0]).toMatchObject({ to: USDT, value: '0' })
    expect(actual.approvalTxs[0].data.startsWith(APPROVE_SELECTOR)).toBe(true)
    expect(estimateContractCallFee).not.toHaveBeenCalled()
  })

  it('prepends a reset when a non-zero allowance cannot be changed directly', async () => {
    getTrc20Allowance.mockResolvedValue('1')
    estimateContractCallFee.mockRejectedValue(new Error('REVERT opcode executed'))

    const actual = await buildApprovalInfo(usdtStep, OWNER, deps)

    expect(actual.approvalTxs).toHaveLength(2)
    // approve(spender, 0) encodes a zero amount word
    expect(actual.approvalTxs[0].data.endsWith('0'.repeat(64))).toBe(true)
    expect(estimateContractCallFee).toHaveBeenCalledWith({
      contractAddress: USDT,
      from: OWNER,
      data: actual.approvalTxs[1].data,
    })
  })
})
