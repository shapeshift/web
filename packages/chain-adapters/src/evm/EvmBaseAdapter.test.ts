import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { describe, expect, it, vi } from 'vitest'

import type { GetFeeDataInput } from '../types'
import { EvmBaseAdapter } from './EvmBaseAdapter'

class TestEvmAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  constructor(http: Partial<unchained.evm.Api> = {}) {
    super({
      assetId: ethAssetId,
      chainId: KnownChainIds.EthereumMainnet,
      rootBip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
      supportedChainIds: [KnownChainIds.EthereumMainnet],
      parser: {} as unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>,
      providers: {
        http: http as unchained.evm.Api,
        ws: {} as unchained.ws.Client<unchained.evm.types.Tx>,
      },
      rpcUrl: '',
    })
  }

  getType(): KnownChainIds.EthereumMainnet {
    return KnownChainIds.EthereumMainnet
  }

  getFeeAssetId(): AssetId {
    return ethAssetId
  }

  getName(): string {
    return 'Test'
  }

  getDisplayName(): string {
    return 'Test'
  }
}

const input: GetFeeDataInput<KnownChainIds.EthereumMainnet> = {
  to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
  value: '123',
  chainSpecific: { from: '0x0000000000000000000000000000000000000000', data: '0x' },
}

const eip1559GasFees = {
  slow: { gasPrice: '4', maxFeePerGas: '240', maxPriorityFeePerGas: '8' },
  average: { gasPrice: '5', maxFeePerGas: '300', maxPriorityFeePerGas: '10' },
  fast: { gasPrice: '6', maxFeePerGas: '360', maxPriorityFeePerGas: '12' },
}

describe('EvmBaseAdapter', () => {
  describe('getFeeData', () => {
    it('prices each speed at its max fee per gas times the estimated gas limit', async () => {
      const adapter = new TestEvmAdapter({
        estimateGas: vi.fn().mockResolvedValue({ gasLimit: '21000' }),
        getGasFees: vi.fn().mockResolvedValue(eip1559GasFees),
      })

      const feeData = await adapter.getFeeData(input)

      expect(feeData.slow.txFee).toBe('5040000')
      expect(feeData.average.txFee).toBe('6300000')
      expect(feeData.fast.txFee).toBe('7560000')
      expect(feeData.average.chainSpecific).toEqual({
        gasLimit: '21000',
        ...eip1559GasFees.average,
      })
    })

    it('prices legacy gas at the gas price', async () => {
      const legacy = { gasPrice: '5' }
      const adapter = new TestEvmAdapter({
        estimateGas: vi.fn().mockResolvedValue({ gasLimit: '21000' }),
        getGasFees: vi.fn().mockResolvedValue({ slow: legacy, average: legacy, fast: legacy }),
      })

      const feeData = await adapter.getFeeData(input)

      expect(feeData.average.txFee).toBe('105000')
    })

    it('adds the l1 fee when the estimate carries an l1 gas limit', async () => {
      const adapter = new TestEvmAdapter()
      const gasFees = { ...eip1559GasFees.average, l1GasPrice: '3' }
      vi.spyOn(adapter, 'getGasLimit').mockResolvedValue({ gasLimit: '21000', l1GasLimit: '1000' })
      vi.spyOn(adapter, 'getGasFeeData').mockResolvedValue({
        slow: gasFees,
        average: gasFees,
        fast: gasFees,
      })

      const feeData = await adapter.getFeeData(input)

      expect(feeData.average.txFee).toBe('6303000')
      expect(feeData.average.chainSpecific).toEqual(
        expect.objectContaining({ gasLimit: '21000', l1GasLimit: '1000', l1GasPrice: '3' }),
      )
    })

    it('surfaces a failed gas estimate', async () => {
      const adapter = new TestEvmAdapter({
        getGasFees: vi.fn().mockResolvedValue(eip1559GasFees),
      })
      vi.spyOn(adapter, 'getGasLimit').mockRejectedValue(new Error('execution reverted'))

      await expect(adapter.getFeeData(input)).rejects.toThrow('execution reverted')
    })
  })
})
