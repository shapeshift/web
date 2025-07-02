// Jest test file for checkTradeStatus
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { Ok } from '@sniptt/monads'
import { describe, expect, it, vi } from 'vitest'

import type { CheckTradeStatusInput } from '../../../types'
// Use vi.mock for ESM-style mocking
import * as xhrModule from '../xhr'
import { checkTradeStatus } from './checkTradeStatus'
vi.mock('../xhr', () => ({
  getBridgeInfoBySourceHash: vi.fn(),
  getBridgeInfoById: vi.fn(),
}))

const getBridgeInfoBySourceHash = xhrModule.getBridgeInfoBySourceHash as ReturnType<typeof vi.fn>
const getBridgeInfoById = xhrModule.getBridgeInfoById as ReturnType<typeof vi.fn>

// Minimal adapter mock
const minimalAdapter = { chainId: '1', getType: () => 'Evm' } as any

const baseInput: Omit<CheckTradeStatusInput, 'txHash'> = {
  chainId: '1',
  address: undefined,
  stepIndex: 0,
  config: {} as any,
  swap: undefined,
  assertGetEvmChainAdapter: vi.fn(() => minimalAdapter),
  fetchIsSmartContractAddressQuery: vi.fn().mockResolvedValue(false),
  assertGetUtxoChainAdapter: vi.fn(() => minimalAdapter),
  assertGetCosmosSdkChainAdapter: vi.fn(() => minimalAdapter),
  assertGetSolanaChainAdapter: vi.fn(() => minimalAdapter),
}

describe('checkTradeStatus', () => {
  it('should return Confirmed status and buyTxHash for a completed ButterSwap swap', async () => {
    // Mock the first call to get basic bridge info with ID
    getBridgeInfoBySourceHash.mockResolvedValue(
      Ok({
        id: 12345,
        state: 1,
        toHash: null,
        fromChain: {} as any,
        toChain: {} as any,
        sourceAddress: '',
        amount: '',
        fromToken: {} as any,
        sourceHash: '',
        receiveToken: {} as any,
        receiveAmount: '',
        toAddress: '',
        timestamp: '',
        timestampLong: 0,
        completeTime: '',
        completeTimeLong: 0,
      }),
    )

    // Mock the second call to get detailed bridge info with relayerHash
    getBridgeInfoById.mockResolvedValue(
      Ok({
        id: 12345,
        state: 1,
        toHash: '7a4d8686e186a5f86f7f3a71dc8181c66e9b40a68edd068e99cdeea77514a157',
        relayerHash: 'bridge_tx_hash_123',
        fromChain: {} as any,
        toChain: {} as any,
        sourceAddress: '',
        amount: '',
        fromToken: {} as any,
        sourceHash: '',
        receiveToken: {} as any,
        receiveAmount: '',
        toAddress: '',
        timestamp: '',
        timestampLong: 0,
        completeTime: '',
        completeTimeLong: 0,
      }),
    )

    const result = await checkTradeStatus({
      ...baseInput,
      txHash: '0x9d15eeda2c298ec630b799618c718d823bb58b729e77b60e6661c7093ff5e81e',
    })
    expect(result.status).toBe(TxStatus.Confirmed)
    expect(result.buyTxHash).toBe(
      '7a4d8686e186a5f86f7f3a71dc8181c66e9b40a68edd068e99cdeea77514a157',
    )
    expect(result.relayerTxHash).toBe('bridge_tx_hash_123')
  })

  it('should return Unknown status if no info is found', async () => {
    getBridgeInfoBySourceHash.mockResolvedValue(Ok(undefined))
    const result = await checkTradeStatus({
      ...baseInput,
      txHash: '0xnotfound',
    })
    expect(result.status).toBe(TxStatus.Unknown)
    expect(result.buyTxHash).toBeUndefined()
  })
})
