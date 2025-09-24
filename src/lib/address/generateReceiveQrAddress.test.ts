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
  cosmosAssetId,
  cosmosChainId,
  dogeAssetId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  gnosisAssetId,
  gnosisChainId,
  ltcAssetId,
  ltcChainId,
  mayachainAssetId,
  mayachainChainId,
  optimismAssetId,
  optimismChainId,
  polygonAssetId,
  polygonChainId,
  solanaChainId,
  solAssetId,
  thorchainAssetId,
  thorchainChainId,
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
// Cosmos chains
const mockThorchainAsset = createMockAsset(
  thorchainAssetId,
  thorchainChainId,
  'THORChain',
  'RUNE',
  8,
)
const mockCosmosAsset = createMockAsset(cosmosAssetId, cosmosChainId, 'Cosmos', 'ATOM', 6)
const mockMayachainAsset = createMockAsset(
  mayachainAssetId,
  mayachainChainId,
  'MayaChain',
  'CACAO',
  10,
)
// Solana chain
const mockSolanaAsset = createMockAsset(solAssetId, solanaChainId, 'Solana', 'SOL', 9)
// WIF SPL token on Solana (using correct AssetId format)
const mockWifAsset = createMockAsset(
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  solanaChainId,
  'dogwifhat',
  'WIF',
  6,
)

describe('generateReceiveQrAddress', () => {
  const testAddress = '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  const testSolanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
  const testThorchainAddress = 'thor1w8x5m9k2p7q4v6n3c8b5f1a9r2e7t4y6u8i5o2'
  const testCosmosAddress = 'cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3'
  const testMayachainAddress = 'maya1w8x5m9k2p7q4v6n3c8b5f1a9r2e7t4y6u8i5o2' // TODO: get real address

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

  describe('Cosmos chains - BIP-21 with amounts (Phase 3)', () => {
    it('should generate BIP-21 format for THORChain (RUNE)', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testThorchainAddress,
        asset: mockThorchainAsset,
        amountCryptoPrecision: '0.1',
      })

      expect(result).toBe(`thorchain:${testThorchainAddress}?amount=0.1`)
    })

    it('should generate BIP-21 format for Cosmos (ATOM)', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testCosmosAddress,
        asset: mockCosmosAsset,
        amountCryptoPrecision: '10.5',
      })

      expect(result).toBe(`cosmos:${testCosmosAddress}?amount=10.5`)
    })

    it('should generate BIP-21 format for MayaChain (CACAO)', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testMayachainAddress,
        asset: mockMayachainAsset,
        amountCryptoPrecision: '5.0',
      })

      expect(result).toBe(`mayachain:${testMayachainAddress}?amount=5.0`)
    })
  })

  describe('Solana - Solana Pay format (Phase 3)', () => {
    it('should return plain address for Solana without amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testSolanaAddress,
        asset: mockSolanaAsset,
      })

      expect(result).toBe(testSolanaAddress)
    })

    it('should generate Solana Pay format with amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testSolanaAddress,
        asset: mockSolanaAsset,
        amountCryptoPrecision: '1.0',
      })

      expect(result).toBe(`solana:${testSolanaAddress}?amount=1.0`)
    })

    it('should generate Solana Pay format with fractional SOL amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testSolanaAddress,
        asset: mockSolanaAsset,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(`solana:${testSolanaAddress}?amount=0.5`)
    })

    it('should generate Solana Pay format with precise amount', () => {
      const result = generateReceiveQrAddress({
        receiveAddress: testSolanaAddress,
        asset: mockSolanaAsset,
        amountCryptoPrecision: '0.123456789',
      })

      expect(result).toBe(`solana:${testSolanaAddress}?amount=0.123456789`)
    })

    describe('SPL Token transfers', () => {
      it('should return plain address for WIF SPL token without amount', () => {
        const result = generateReceiveQrAddress({
          receiveAddress: testSolanaAddress,
          asset: mockWifAsset,
        })

        expect(result).toBe(testSolanaAddress)
      })

      it('should generate Solana Pay SPL transfer format for WIF token', () => {
        const result = generateReceiveQrAddress({
          receiveAddress: testSolanaAddress,
          asset: mockWifAsset,
          amountCryptoPrecision: '0.1',
        })

        // SPL token transfer format: solana:recipient?amount=0.1&spl-token=tokenMint
        expect(result).toBe(
          `solana:${testSolanaAddress}?amount=0.1&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
        )
      })

      it('should generate Solana Pay SPL transfer format with fractional amount', () => {
        const result = generateReceiveQrAddress({
          receiveAddress: testSolanaAddress,
          asset: mockWifAsset,
          amountCryptoPrecision: '2.5',
        })

        expect(result).toBe(
          `solana:${testSolanaAddress}?amount=2.5&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
        )
      })

      it('should generate Solana Pay SPL transfer format with precise amount', () => {
        const result = generateReceiveQrAddress({
          receiveAddress: testSolanaAddress,
          asset: mockWifAsset,
          amountCryptoPrecision: '0.123456',
        })

        expect(result).toBe(
          `solana:${testSolanaAddress}?amount=0.123456&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
        )
      })
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
