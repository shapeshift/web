import {
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { generateReceiveQrAddress } from './generateReceiveQrAddress'

import { usdcAssetId } from '@/test/mocks/accounts'

// Mock assets for testing
const mockEthAsset: Asset = {
  assetId: ethAssetId,
  chainId: ethChainId,
  name: 'Ethereum',
  symbol: 'ETH',
  precision: 18,
} as Asset

const mockBtcAsset: Asset = {
  assetId: btcAssetId,
  chainId: btcChainId,
  name: 'Bitcoin',
  symbol: 'BTC',
  precision: 8,
} as Asset

const mockBaseAsset: Asset = {
  assetId: baseAssetId,
  chainId: baseChainId,
  name: 'Base',
  symbol: 'ETH',
  precision: 18,
} as Asset

const mockAvalancheAsset: Asset = {
  assetId: avalancheAssetId,
  chainId: avalancheChainId,
  name: 'Avalanche',
  symbol: 'AVAX',
  precision: 18,
} as Asset

const mockUsdcAsset: Asset = {
  assetId: usdcAssetId,
  chainId: ethChainId,
  name: 'USD Coin',
  symbol: 'USDC',
  precision: 6,
} as Asset

describe('generateReceiveQrAddress', () => {
  const testAddress = '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'

  describe('UTXO chains (Phase 1)', () => {
    it('should return plain address for Bitcoin', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testBtcAddress,
        asset: mockBtcAsset,
      })

      expect(result).toBe(testBtcAddress)
    })

    it('should return plain address for Bitcoin even with amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testBtcAddress,
        asset: mockBtcAsset,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(testBtcAddress)
    })
  })

  describe('EVM chains - Basic addresses (Phase 1)', () => {
    it('should generate EIP-681 format for Ethereum mainnet', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockEthAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@1`)
    })

    it('should generate EIP-681 format for Base', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockBaseAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@8453`)
    })

    it('should generate EIP-681 format for Avalanche', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockAvalancheAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@43114`)
    })
  })

  describe('EVM chains - Native tokens with amounts (Phase 2)', () => {
    it('should generate EIP-681 format with value for Ethereum', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockEthAsset,
        amountCryptoPrecision: '1.0',
      })

      expect(result).toBe(`ethereum:${testAddress}@1?value=1000000000000000000`)
    })

    it('should generate EIP-681 format with value for fractional ETH', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockEthAsset,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(`ethereum:${testAddress}@1?value=500000000000000000`)
    })

    it('should generate EIP-681 format with value for Base ETH', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockBaseAsset,
        amountCryptoPrecision: '2.0',
      })

      expect(result).toBe(`ethereum:${testAddress}@8453?value=2000000000000000000`)
    })

    it('should generate EIP-681 format with value for Avalanche AVAX', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockAvalancheAsset,
        amountCryptoPrecision: '10.5',
      })

      expect(result).toBe(`ethereum:${testAddress}@43114?value=10500000000000000000`)
    })
  })

  describe('EVM chains - ERC-20 tokens with amounts (Phase 2)', () => {
    it('should generate EIP-681 transfer format for USDC', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockUsdcAsset,
        amountCryptoPrecision: '100.0',
      })

      // USDC has 6 decimals, so 100.0 USDC = 100000000 base units
      // USDC contract address on Ethereum is 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=100000000`,
      )
    })

    it('should generate EIP-681 transfer format for fractional USDC', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockUsdcAsset,
        amountCryptoPrecision: '50.123456',
      })

      // 50.123456 USDC = 50123456 base units (6 decimals)
      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=50123456`,
      )
    })

    it('should handle very small USDC amounts', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockUsdcAsset,
        amountCryptoPrecision: '0.000001',
      })

      // 0.000001 USDC = 1 base unit (smallest unit)
      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=1`,
      )
    })
  })
})
