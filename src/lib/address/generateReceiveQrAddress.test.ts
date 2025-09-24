import {
  arbitrumAssetId,
  arbitrumChainId,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
  bchAssetId,
  bchChainId,
  bscAssetId,
  bscChainId,
  btcAssetId,
  btcChainId,
  dogeAssetId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  gnosisAssetId,
  gnosisChainId,
  ltcAssetId,
  ltcChainId,
  optimismAssetId,
  optimismChainId,
  polygonAssetId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { generateReceiveQrAddress } from './generateReceiveQrAddress'

import { usdcAssetId } from '@/test/mocks/accounts'

// Helper function to create mock assets
const createMockAsset = (
  assetId: string,
  chainId: string,
  name: string,
  symbol: string,
  precision: number,
): Asset =>
  ({
    assetId,
    chainId,
    name,
    symbol,
    precision,
  }) as Asset

// Mock assets for testing
const mockEthAsset = createMockAsset(ethAssetId, ethChainId, 'Ethereum', 'ETH', 18)
const mockArbitrumAsset = createMockAsset(arbitrumAssetId, arbitrumChainId, 'Arbitrum', 'ETH', 18)
const mockOptimismAsset = createMockAsset(optimismAssetId, optimismChainId, 'Optimism', 'ETH', 18)
const mockPolygonAsset = createMockAsset(polygonAssetId, polygonChainId, 'Polygon', 'MATIC', 18)
const mockBscAsset = createMockAsset(bscAssetId, bscChainId, 'BNB Smart Chain', 'BNB', 18)
const mockGnosisAsset = createMockAsset(gnosisAssetId, gnosisChainId, 'Gnosis', 'xDAI', 18)
const mockBtcAsset = createMockAsset(btcAssetId, btcChainId, 'Bitcoin', 'BTC', 8)
const mockBaseAsset = createMockAsset(baseAssetId, baseChainId, 'Base', 'ETH', 18)
const mockAvalancheAsset = createMockAsset(
  avalancheAssetId,
  avalancheChainId,
  'Avalanche',
  'AVAX',
  18,
)
const mockUsdcAsset = createMockAsset(usdcAssetId, ethChainId, 'USD Coin', 'USDC', 6)
const mockDogeAsset = createMockAsset(dogeAssetId, dogeChainId, 'Dogecoin', 'DOGE', 8)
const mockLtcAsset = createMockAsset(ltcAssetId, ltcChainId, 'Litecoin', 'LTC', 8)
const mockBchAsset = createMockAsset(bchAssetId, bchChainId, 'Bitcoin Cash', 'BCH', 8)

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
  })

  describe('UTXO chains - BIP-21 with amounts (Phase 2)', () => {
    it('should generate BIP-21 format for Bitcoin with amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testBtcAddress,
        asset: mockBtcAsset,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(`bitcoin:${testBtcAddress}?amount=0.5`)
    })

    it('should generate BIP-21 format for Bitcoin with precise amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testBtcAddress,
        asset: mockBtcAsset,
        amountCryptoPrecision: '0.00123456',
      })

      expect(result).toBe(`bitcoin:${testBtcAddress}?amount=0.00123456`)
    })

    it('should generate BIP-21 format for Dogecoin with amount', () => {
      const dogeAddress = 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'
      const result = generateReceiveQrAddress({
        receiveAddress: dogeAddress,
        asset: mockDogeAsset,
        amountCryptoPrecision: '100.0',
      })

      expect(result).toBe(`doge:${dogeAddress}?amount=100.0`)
    })

    it('should generate BIP-21 format for Litecoin with amount', () => {
      const ltcAddress = 'LTC123DEADBEEF5678ABCD1234DEADBEEF567'
      const result = generateReceiveQrAddress({
        receiveAddress: ltcAddress,
        asset: mockLtcAsset,
        amountCryptoPrecision: '2.5',
      })

      expect(result).toBe(`litecoin:${ltcAddress}?amount=2.5`)
    })

    it('should handle Bitcoin Cash addresses with existing prefix', () => {
      const bchAddressWithPrefix = 'bitcoincash:qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c'
      const result = generateReceiveQrAddress({
        receiveAddress: bchAddressWithPrefix,
        asset: mockBchAsset,
        amountCryptoPrecision: '0.1',
      })

      expect(result).toBe(`bitcoincash:qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c?amount=0.1`)
    })

    it('should handle Bitcoin Cash addresses without prefix', () => {
      const bchAddressWithoutPrefix = 'qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c'
      const result = generateReceiveQrAddress({
        receiveAddress: bchAddressWithoutPrefix,
        asset: mockBchAsset,
        amountCryptoPrecision: '0.1',
      })

      expect(result).toBe(`bitcoincash:${bchAddressWithoutPrefix}?amount=0.1`)
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

    it('should generate EIP-681 format for Arbitrum', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockArbitrumAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@42161`)
    })

    it('should generate EIP-681 format for Optimism', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockOptimismAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@10`)
    })

    it('should generate EIP-681 format for Polygon', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockPolygonAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@137`)
    })

    it('should generate EIP-681 format for BSC', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockBscAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@56`)
    })

    it('should generate EIP-681 format for Gnosis', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockGnosisAsset,
      })

      expect(result).toBe(`ethereum:${testAddress}@100`)
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

  describe('Edge cases and error handling', () => {
    it('should handle empty receive address', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: '',
        asset: mockBtcAsset,
        amountCryptoPrecision: '1.0',
      })

      expect(result).toBe('')
    })

    it('should handle zero amounts for UTXO chains', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testBtcAddress,
        asset: mockBtcAsset,
        amountCryptoPrecision: '0',
      })

      expect(result).toBe(`bitcoin:${testBtcAddress}?amount=0`)
    })

    it('should handle zero amounts for EVM chains', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockEthAsset,
        amountCryptoPrecision: '0',
      })

      expect(result).toBe(`ethereum:${testAddress}@1?value=0`)
    })

    it('should handle very small amounts with proper precision', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testAddress,
        asset: mockUsdcAsset,
        amountCryptoPrecision: '0.000001',
      })

      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=1`,
      )
    })
  })
})
