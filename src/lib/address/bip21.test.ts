import {
  arbitrumAssetId,
  arbitrumChainId,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
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
  solanaChainId,
  solAssetId,
  thorchainAssetId,
  thorchainChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { parseUrlDirect } from './bip21'
import { EMPTY_ADDRESS_ERROR } from './constants'

import { getAssetService } from '@/lib/asset-service'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { store } from '@/state/store'
import { usdcAssetId } from '@/test/mocks/accounts'
import { mockChainAdapters } from '@/test/mocks/portfolio'

beforeAll(async () => {
  const service = await getAssetService()
  store.dispatch(
    assets.actions.upsertAssets({
      byId: service.assetsById,
      ids: service.assetIds,
    }),
  )
})

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('parseUrlDirect', () => {
  describe('Plain addresses (should return null)', () => {
    it('should return null for plain Bitcoin addresses', () => {
      const result = parseUrlDirect('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      expect(result).toBeNull()
    })

    it('should return null for plain Ethereum addresses', () => {
      const result = parseUrlDirect('0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD')
      expect(result).toBeNull()
    })

    it('should return null for ENS domains', () => {
      const result = parseUrlDirect('vitalik.eth')
      expect(result).toBeNull()
    })

    it('should return null for plain Solana addresses', () => {
      const result = parseUrlDirect('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')
      expect(result).toBeNull()
    })
  })

  describe('Pure BIP-21 URLs (UTXO chains)', () => {
    it('should parse address from BIP-21 URL with bitcoin URN scheme', () => {
      const result = parseUrlDirect('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')

      expect(result).toEqual({
        assetId: btcAssetId,
        chainId: btcChainId,
        maybeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      })
    })

    it('should parse Bitcoin BIP-21 with amount', () => {
      const result = parseUrlDirect('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.424242')

      expect(result).toEqual({
        assetId: btcAssetId,
        chainId: btcChainId,
        maybeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amountCryptoPrecision: '0.424242',
      })
    })

    it('should parse DOGE BIP-21 with amount', () => {
      const result = parseUrlDirect('doge:DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L?amount=42.123456')

      expect(result).toEqual({
        assetId: dogeAssetId,
        chainId: dogeChainId,
        maybeAddress: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
        amountCryptoPrecision: '42.123456',
      })
    })

    it('should parse Litecoin BIP-21 with amount', () => {
      const result = parseUrlDirect('litecoin:LTC123DEADBEEF5678ABCD1234DEADBEEF567?amount=2.5')

      expect(result).toEqual({
        assetId: ltcAssetId,
        chainId: ltcChainId,
        maybeAddress: 'LTC123DEADBEEF5678ABCD1234DEADBEEF567',
        amountCryptoPrecision: '2.5',
      })
    })
  })

  describe('Pure BIP-21 URLs (Cosmos / THORMaya chains)', () => {
    it('should parse THORChain BIP-21 with amount', () => {
      const result = parseUrlDirect(
        'thorchain:thor1w8x5m9k2p7q4v6n3c8b5f1a9r2e7t4y6u8i5o2?amount=0.1',
      )

      expect(result).toEqual({
        assetId: thorchainAssetId,
        chainId: thorchainChainId,
        maybeAddress: 'thor1w8x5m9k2p7q4v6n3c8b5f1a9r2e7t4y6u8i5o2',
        amountCryptoPrecision: '0.1',
      })
    })

    it('should parse Cosmos BIP-21 with amount', () => {
      const result = parseUrlDirect(
        'cosmos:cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3?amount=10.5',
      )

      expect(result).toEqual({
        assetId: cosmosAssetId,
        chainId: cosmosChainId,
        maybeAddress: 'cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3',
        amountCryptoPrecision: '10.5',
      })
    })

    it('should parse Maya BIP-21 with amount', () => {
      const result = parseUrlDirect(
        'mayachain:maya1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3?amount=5.25',
      )

      expect(result).toEqual({
        assetId: mayachainAssetId,
        chainId: mayachainChainId,
        maybeAddress: 'maya1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3',
        amountCryptoPrecision: '5.25',
      })
    })
  })

  describe('EIP-681 URLs (EVM chains)', () => {
    it('should parse address from EIP-681 URL without parameters', () => {
      const result = parseUrlDirect('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@1')

      expect(result).toEqual({
        assetId: ethAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      })
    })

    it('should parse EIP-681 URL with amount/value params', () => {
      const result = parseUrlDirect(
        'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@1?value=1000000000000000000',
      )

      expect(result).toEqual({
        assetId: ethAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        amountCryptoPrecision: '1',
      })
    })

    it('should parse native EVM asset with amount and chain_id as hex', () => {
      const result = parseUrlDirect('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@0xa4b1')

      expect(result).toEqual({
        assetId: arbitrumAssetId,
        chainId: arbitrumChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      })
    })

    it('should parse ERC-20 token transfer with amount and destination', () => {
      const result = parseUrlDirect(
        'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD&uint256=100000',
      )

      expect(result).toEqual({
        assetId: usdcAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        amountCryptoPrecision: '0.1',
      })
    })

    it('should return null for EIP-681 URL missing chain_id', () => {
      const result = parseUrlDirect(
        'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD/transfer?address=0xABCDEF1234567890ABCDEF1234567890ABCDEF12&uint256=1000000',
      )
      expect(result).toBeNull()
    })

    it('should throw error for ERC-20 token not in asset slice', () => {
      expect(() =>
        parseUrlDirect(
          'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@1/transfer?address=0xABCDEF1234567890ABCDEF1234567890ABCDEF12&uint256=1000000',
        ),
      ).toThrow('modals.send.errors.qrDangerousEthUrl')
    })

    it('should parse EIP-681 URL with scientific notation amount parameter', () => {
      const result = parseUrlDirect(
        'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@1?amount=2.014e18',
      )

      expect(result).toEqual({
        assetId: ethAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        amountCryptoPrecision: '2.014',
      })
    })

    it('should parse EIP-681 URL with scientific notation value parameter', () => {
      const result = parseUrlDirect(
        'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@1?value=1.5e18',
      )

      expect(result).toEqual({
        assetId: ethAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        amountCryptoPrecision: '1.5',
      })
    })
  })

  describe('Solana Pay URLs', () => {
    it('should parse Solana Pay URL without amount', () => {
      const result = parseUrlDirect('solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')

      expect(result).toEqual({
        assetId: solAssetId,
        chainId: solanaChainId,
        maybeAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      })
    })

    it('should parse Solana Pay URL with amount', () => {
      const result = parseUrlDirect(
        'solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?amount=0.123456789',
      )

      expect(result).toEqual({
        assetId: solAssetId,
        chainId: solanaChainId,
        maybeAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        amountCryptoPrecision: '0.123456789',
      })
    })

    it('should parse Solana Pay URL with SPL token', () => {
      const wifAssetId = toAssetId({
        chainId: solanaChainId,
        assetNamespace: 'token',
        assetReference: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      })

      const result = parseUrlDirect(
        'solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?amount=0.1&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      )

      expect(result).toEqual({
        assetId: wifAssetId,
        chainId: solanaChainId,
        maybeAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        amountCryptoPrecision: '0.1',
      })
    })

    it('should parse Solana Pay URL with scientific notation amount', () => {
      const result = parseUrlDirect(
        'solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?amount=1.5e-3',
      )

      expect(result).toEqual({
        assetId: solAssetId,
        chainId: solanaChainId,
        maybeAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        amountCryptoPrecision: '0.0015',
      })
    })
  })

  describe('Trust Mobile (BIP-21)', () => {
    it('should parse Ethereum BIP-21 with amount', () => {
      const result = parseUrlDirect(
        'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?amount=0.1',
      )

      expect(result).toEqual({
        assetId: ethAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        amountCryptoPrecision: '0.1',
      })
    })

    it('should parse Base BIP-21 with amount', () => {
      const result = parseUrlDirect('base:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?amount=0.1')

      expect(result).toEqual({
        assetId: baseAssetId,
        chainId: baseChainId,
        maybeAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        amountCryptoPrecision: '0.1',
      })
    })

    it('should parse Avalanche BIP-21 with amount', () => {
      const result = parseUrlDirect(
        'avalanchec:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?amount=1.1234567812345678',
      )

      expect(result).toEqual({
        assetId: avalancheAssetId,
        chainId: avalancheChainId,
        maybeAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        amountCryptoPrecision: '1.1234567812345677',
      })
    })

    it('should parse Gnosis BIP-21 with amount', () => {
      const result = parseUrlDirect('xdai:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?amount=0.01')

      expect(result).toEqual({
        assetId: gnosisAssetId,
        chainId: gnosisChainId,
        maybeAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        amountCryptoPrecision: '0.01',
      })
    })
  })

  describe('Error handling', () => {
    it('should return null for unsupported scheme', () => {
      const result = parseUrlDirect(
        'stellar:GADCG5ZWXLGQXVUXR4ZPJQLQ87XHTJV4JCTF8QFV5Z8LEZH4QRXB6ABC?amount=50',
      )
      expect(result).toBeNull()
    })

    it('should return null for invalid BIP-21 scheme', () => {
      const result = parseUrlDirect('invalidscheme:someaddress')
      expect(result).toBeNull()
    })

    it('should parse ethereum URL without chain_id as pure BIP-21', () => {
      const result = parseUrlDirect('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD')
      expect(result).toEqual({
        assetId: ethAssetId,
        chainId: ethChainId,
        maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle zero amounts', () => {
      const result = parseUrlDirect('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0')

      expect(result).toEqual({
        assetId: btcAssetId,
        chainId: btcChainId,
        maybeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amountCryptoPrecision: '0',
      })
    })

    it('should handle very small amounts', () => {
      const result = parseUrlDirect('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.00000001')

      expect(result).toEqual({
        assetId: btcAssetId,
        chainId: btcChainId,
        maybeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amountCryptoPrecision: '0.00000001',
      })
    })

    it('should throw error for empty address in BIP-21 URL', () => {
      expect(() => {
        parseUrlDirect('bitcoin:?amount=1.0')
      }).toThrow(EMPTY_ADDRESS_ERROR)
    })
  })
})
