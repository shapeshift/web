import type { AccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { getToolStateStatus, validateExecutionContext } from '../lib/executionUtils'
import { StepStatus } from '../lib/stepUtils'

describe('getToolStateStatus', () => {
  it('should return FAILED for output-error state', () => {
    expect(getToolStateStatus('output-error')).toBe(StepStatus.FAILED)
  })

  it('should return IN_PROGRESS for input-streaming state', () => {
    expect(getToolStateStatus('input-streaming')).toBe(StepStatus.IN_PROGRESS)
  })

  it('should return IN_PROGRESS for input-available state', () => {
    expect(getToolStateStatus('input-available')).toBe(StepStatus.IN_PROGRESS)
  })

  it('should return COMPLETE for output-available state', () => {
    expect(getToolStateStatus('output-available')).toBe(StepStatus.COMPLETE)
  })

  it('should return NOT_STARTED for unknown state', () => {
    expect(getToolStateStatus('partial' as 'output-available')).toBe(StepStatus.NOT_STARTED)
  })
})

describe('validateExecutionContext', () => {
  const mockWallet = {} as HDWallet
  const mockAccountId = 'eip155:1:0x123' as AccountId
  const mockAccountMetadata = { bip44Params: {} } as AccountMetadata

  it('should return context when all fields are present', () => {
    const result = validateExecutionContext(
      { wallet: mockWallet },
      mockAccountId,
      mockAccountMetadata,
    )
    expect(result).toEqual({
      wallet: mockWallet,
      accountId: mockAccountId,
      accountMetadata: mockAccountMetadata,
    })
  })

  it('should throw when wallet is null', () => {
    expect(() =>
      validateExecutionContext({ wallet: null }, mockAccountId, mockAccountMetadata),
    ).toThrow('No wallet connected')
  })

  it('should throw when accountId is undefined', () => {
    expect(() =>
      validateExecutionContext({ wallet: mockWallet }, undefined, mockAccountMetadata),
    ).toThrow('Account not found')
  })

  it('should throw when accountMetadata is undefined', () => {
    expect(() =>
      validateExecutionContext({ wallet: mockWallet }, mockAccountId, undefined),
    ).toThrow('Account not found')
  })

  it('should throw when both accountId and accountMetadata are undefined', () => {
    expect(() => validateExecutionContext({ wallet: mockWallet }, undefined, undefined)).toThrow(
      'Account not found',
    )
  })

  it('should throw when wallet is null and account fields are undefined', () => {
    expect(() => validateExecutionContext({ wallet: null }, undefined, undefined)).toThrow(
      'No wallet connected',
    )
  })
})
