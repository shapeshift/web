import { ethAssetId } from '@shapeshiftoss/caip'
import type { ChainAdapter, ChainAdapterManager, evm } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

const feeData = {
  fast: {
    txFee: '1',
    chainSpecific: { approvalFeeCryptoBaseUnit: '1', gasLimit: '1', gasPrice: '1' },
    tradeFee: '2',
  },
}

export const mockChainAdapterManager: ChainAdapterManager = new Map([
  [
    KnownChainIds.EthereumMainnet,
    {
      getAddress: jest.fn(() => Promise.resolve('0xthisIsMyAddress')),
      getFeeData: jest.fn(() => feeData),
      getFeeAssetId: jest.fn(() => ethAssetId),
      getGasFeeData: jest.fn(
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
    } as unknown as ChainAdapter<'eip155'>,
  ],
])
