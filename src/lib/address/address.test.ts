import {
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  solanaChainId,
  solAssetId,
} from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import { parseAddressInputWithChainId, parseMaybeUrl } from './address'

import { mockChainAdapters } from '@/test/mocks/portfolio'

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('@/lib/address', () => {
  describe('parseMaybeUrl', () => {
    it('should find Bitcoin address in correct chain', async () => {
      const result = await parseMaybeUrl({
        urlOrAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      })

      expect(result).toEqual({
        chainId: btcChainId,
        value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        assetId: btcAssetId,
      })
    })

    it('should find Ethereum address in correct chain', async () => {
      const result = await parseMaybeUrl({
        urlOrAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      })

      expect(result).toEqual({
        chainId: ethChainId,
        value: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        assetId: ethAssetId,
      })
    })

    it('should find Solana address in correct chain', async () => {
      const result = await parseMaybeUrl({
        urlOrAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      })

      expect(result).toEqual({
        chainId: solanaChainId,
        value: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        assetId: solAssetId,
      })
    })

    it('should throw error for invalid address', async () => {
      await expect(
        parseMaybeUrl({
          urlOrAddress: 'invalid-address-format',
        }),
      ).rejects.toThrow('Address not found in QR code')
    })
  })

  describe('parseAddressInputWithChainId', () => {
    it('should validate Bitcoin address for correct chain', async () => {
      const result = await parseAddressInputWithChainId({
        chainId: btcChainId,
        urlOrAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      })

      expect(result).toEqual({
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        vanityAddress: '',
        chainId: btcChainId,
      })
    })

    it('should return empty for invalid address on specific chain', async () => {
      const result = await parseAddressInputWithChainId({
        chainId: btcChainId,
        urlOrAddress: 'invalid-bitcoin-address',
      })

      expect(result).toEqual({
        address: '',
        vanityAddress: '',
        chainId: btcChainId,
      })
    })

    it('should return empty for address on wrong chain', async () => {
      // Ethereum address on Bitcoin chain should fail
      const result = await parseAddressInputWithChainId({
        chainId: btcChainId,
        urlOrAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      })

      expect(result).toEqual({
        address: '',
        vanityAddress: '',
        chainId: btcChainId,
      })
    })
  })
})
