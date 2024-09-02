import { ethAssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { vi } from 'vitest'

const feeData = {
  fast: {
    txFee: '1',
    chainSpecific: { approvalFeeCryptoBaseUnit: '1', gasLimit: '1', gasPrice: '1' },
    tradeFee: '2',
  },
}

export const mockEvmChainAdapter: evm.EvmChainAdapter = {
  getAddress: vi.fn(() => Promise.resolve('0xthisIsMyAddress')),
  getFeeData: vi.fn(() => feeData),
  getFeeAssetId: vi.fn(() => ethAssetId),
  getChainId: vi.fn(() => KnownChainIds.EthereumMainnet),
  getGasFeeData: vi.fn(
    (): evm.GasFeeDataEstimate => ({
      [FeeDataKey.Slow]: {
        gasPrice: '1',
        maxFeePerGas: '2',
        maxPriorityFeePerGas: '3',
      },
      [FeeDataKey.Average]: {
        gasPrice: '4',
        maxFeePerGas: '5',
        maxPriorityFeePerGas: '6',
      },
      [FeeDataKey.Fast]: {
        gasPrice: '7',
        maxFeePerGas: '8',
        maxPriorityFeePerGas: '9',
      },
    }),
  ),
} as unknown as evm.EvmChainAdapter
