import { describe, expect, it } from 'vitest'

import { generateReceiveQrText } from './generateReceiveQrText'
import { EMPTY_ADDRESS_ERROR } from './constants'

import {
  arbitrum,
  avalanche,
  base,
  bitcoin,
  bitcoinCash,
  bsc,
  cosmos,
  dogecoin,
  ethereum,
  fox,
  gnosis,
  litecoin,
  mayachain,
  optimism,
  polygon,
  solana,
  thorchain,
  usdc,
  wif,
} from '@/test/mocks/assets'

describe('generateReceiveQrText', () => {
  const testAddress = '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  const testSolanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
  const testThorchainAddress = 'thorpub1addwnpepq08ltrkgtsg40sd2qhac4cf402f2gy7maelzsa7nw92n75zfh3cm27af493'
  const testCosmosAddress = 'cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3'
  const testMayachainAddress = 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl'

  describe('UTXO chains', () => {
    it('should return plain address for Bitcoin', () => {
      const result = generateReceiveQrText({
        receiveAddress: testBtcAddress,
        asset: bitcoin,
      })

      expect(result).toBe(testBtcAddress)
    })
  })

  describe('UTXO chains - BIP-21 with amounts', () => {
    it('should generate BIP-21 format for Bitcoin with amount', () => {
      const result = generateReceiveQrText({
        receiveAddress: testBtcAddress,
        asset: bitcoin,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(`bitcoin:${testBtcAddress}?amount=0.5`)
    })

    it('should generate BIP-21 format for Bitcoin with precise amount', () => {
      const result = generateReceiveQrText({
        receiveAddress: testBtcAddress,
        asset: bitcoin,
        amountCryptoPrecision: '0.00123456',
      })

      expect(result).toBe(`bitcoin:${testBtcAddress}?amount=0.00123456`)
    })

    it('should generate BIP-21 format for Dogecoin with amount', () => {
      const dogeAddress = 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'
      const result = generateReceiveQrText({
        receiveAddress: dogeAddress,
        asset: dogecoin,
        amountCryptoPrecision: '100.0',
      })

      expect(result).toBe(`doge:${dogeAddress}?amount=100.0`)
    })

    it('should generate BIP-21 format for Litecoin with amount', () => {
      const ltcAddress = 'LTC123DEADBEEF5678ABCD1234DEADBEEF567'
      const result = generateReceiveQrText({
        receiveAddress: ltcAddress,
        asset: litecoin,
        amountCryptoPrecision: '2.5',
      })

      expect(result).toBe(`litecoin:${ltcAddress}?amount=2.5`)
    })

    it('should handle Bitcoin Cash addresses with existing prefix', () => {
      const bchAddressWithPrefix = 'bitcoincash:qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c'
      const result = generateReceiveQrText({
        receiveAddress: bchAddressWithPrefix,
        asset: bitcoinCash,
        amountCryptoPrecision: '0.1',
      })

      expect(result).toBe(`bitcoincash:qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c?amount=0.1`)
    })

    it('should handle Bitcoin Cash addresses without prefix', () => {
      const bchAddressWithoutPrefix = 'qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c'
      const result = generateReceiveQrText({
        receiveAddress: bchAddressWithoutPrefix,
        asset: bitcoinCash,
        amountCryptoPrecision: '0.1',
      })

      expect(result).toBe(`bitcoincash:${bchAddressWithoutPrefix}?amount=0.1`)
    })
  })

  describe('EVM chains - Basic addresses', () => {
    it('should generate EIP-681 format for Ethereum mainnet', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: ethereum,
      })

      expect(result).toBe(`ethereum:${testAddress}@1`)
    })

    it('should generate EIP-681 format for Arbitrum', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: arbitrum,
      })

      expect(result).toBe(`ethereum:${testAddress}@42161`)
    })

    it('should generate EIP-681 format for Optimism', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: optimism,
      })

      expect(result).toBe(`ethereum:${testAddress}@10`)
    })

    it('should generate EIP-681 format for Polygon', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: polygon,
      })

      expect(result).toBe(`ethereum:${testAddress}@137`)
    })

    it('should generate EIP-681 format for BSC', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: bsc,
      })

      expect(result).toBe(`ethereum:${testAddress}@56`)
    })

    it('should generate EIP-681 format for Gnosis', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: gnosis,
      })

      expect(result).toBe(`ethereum:${testAddress}@100`)
    })

    it('should generate EIP-681 format for Base', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: base,
      })

      expect(result).toBe(`ethereum:${testAddress}@8453`)
    })

    it('should generate EIP-681 format for Avalanche', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: avalanche,
      })

      expect(result).toBe(`ethereum:${testAddress}@43114`)
    })
  })

  describe('EVM chains - Native tokens with amounts', () => {
    it('should generate EIP-681 format with value for Ethereum', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: ethereum,
        amountCryptoPrecision: '1.0',
      })

      expect(result).toBe(`ethereum:${testAddress}@1?value=1e18`)
    })

    it('should generate EIP-681 format with value for fractional ETH', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: ethereum,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(`ethereum:${testAddress}@1?value=5e17`)
    })

    it('should generate EIP-681 format with value for Base ETH', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: base,
        amountCryptoPrecision: '2.0',
      })

      expect(result).toBe(`ethereum:${testAddress}@8453?value=2e18`)
    })

    it('should generate EIP-681 format with value for Avalanche AVAX', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: avalanche,
        amountCryptoPrecision: '10.5',
      })

      expect(result).toBe(`ethereum:${testAddress}@43114?value=1.05e19`)
    })
  })

  describe('EVM chains - ERC-20 tokens with amounts', () => {
    it('should generate EIP-681 transfer format for USDC', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: usdc,
        amountCryptoPrecision: '100.0',
      })

      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=1e8`,
      )
    })

    it('should generate EIP-681 transfer format for fractional USDC', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: usdc,
        amountCryptoPrecision: '50.123456',
      })

      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=5.0123456e7`,
      )
    })

    it('should handle very small USDC amounts', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: usdc,
        amountCryptoPrecision: '0.000001',
      })

      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=1`,
      )
    })

    it('should generate EIP-681 transfer format for high-precision FOX', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: fox,
        amountCryptoPrecision: '123.123456789012345678',
      })

      expect(result).toBe(
        `ethereum:0xc770eefad204b5180df6a14ee197d99d808ee52d@1/transfer?address=${testAddress}&uint256=1.23123456789012345678e20`,
      )
    })

    it('should handle very small FOX amounts with full precision', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: fox,
        amountCryptoPrecision: '0.000000000000000001',
      })

      expect(result).toBe(
        `ethereum:0xc770eefad204b5180df6a14ee197d99d808ee52d@1/transfer?address=${testAddress}&uint256=1`,
      )
    })

    it('should handle fractional FOX with maximum precision', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: fox,
        amountCryptoPrecision: '1.999999999999999999',
      })

      expect(result).toBe(
        `ethereum:0xc770eefad204b5180df6a14ee197d99d808ee52d@1/transfer?address=${testAddress}&uint256=1.999999999999999999e18`,
      )
    })
  })

  describe('Cosmos chains - BIP-21 with amounts', () => {
    it('should generate BIP-21 format for THORChain (RUNE)', () => {
      const result = generateReceiveQrText({
        receiveAddress: testThorchainAddress,
        asset: thorchain,
        amountCryptoPrecision: '0.1',
      })

      expect(result).toBe(`thorchain:${testThorchainAddress}?amount=0.1`)
    })

    it('should generate BIP-21 format for Cosmos (ATOM)', () => {
      const result = generateReceiveQrText({
        receiveAddress: testCosmosAddress,
        asset: cosmos,
        amountCryptoPrecision: '10.5',
      })

      expect(result).toBe(`cosmos:${testCosmosAddress}?amount=10.5`)
    })

    it('should generate BIP-21 format for MayaChain (CACAO)', () => {
      const result = generateReceiveQrText({
        receiveAddress: testMayachainAddress,
        asset: mayachain,
        amountCryptoPrecision: '5.0',
      })

      expect(result).toBe(`mayachain:${testMayachainAddress}?amount=5.0`)
    })
  })

  describe('Solana - Solana Pay format', () => {
    it('should return plain address for Solana without amount', () => {
      const result = generateReceiveQrText({
        receiveAddress: testSolanaAddress,
        asset: solana,
      })

      expect(result).toBe(testSolanaAddress)
    })

    it('should generate Solana Pay format with amount', () => {
      const result = generateReceiveQrText({
        receiveAddress: testSolanaAddress,
        asset: solana,
        amountCryptoPrecision: '1.0',
      })

      expect(result).toBe(`solana:${testSolanaAddress}?amount=1`)
    })

    it('should generate Solana Pay format with fractional SOL amount', () => {
      const result = generateReceiveQrText({
        receiveAddress: testSolanaAddress,
        asset: solana,
        amountCryptoPrecision: '0.5',
      })

      expect(result).toBe(`solana:${testSolanaAddress}?amount=0.5`)
    })

    it('should generate Solana Pay format with precise amount', () => {
      const result = generateReceiveQrText({
        receiveAddress: testSolanaAddress,
        asset: solana,
        amountCryptoPrecision: '0.123456789',
      })

      expect(result).toBe(`solana:${testSolanaAddress}?amount=0.123456789`)
    })

    describe('SPL Token transfers', () => {
      it('should return plain address for WIF SPL token without amount', () => {
        const result = generateReceiveQrText({
          receiveAddress: testSolanaAddress,
          asset: wif,
        })

        expect(result).toBe(testSolanaAddress)
      })

      it('should generate Solana Pay SPL transfer format for WIF token', () => {
        const result = generateReceiveQrText({
          receiveAddress: testSolanaAddress,
          asset: wif,
          amountCryptoPrecision: '0.1',
        })

        // SPL token transfer format: solana:recipient?amount=0.1&spl-token=tokenMint
        expect(result).toBe(
          `solana:${testSolanaAddress}?amount=0.1&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
        )
      })

      it('should generate Solana Pay SPL transfer format with fractional amount', () => {
        const result = generateReceiveQrText({
          receiveAddress: testSolanaAddress,
          asset: wif,
          amountCryptoPrecision: '2.5',
        })

        expect(result).toBe(
          `solana:${testSolanaAddress}?amount=2.5&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
        )
      })

      it('should generate Solana Pay SPL transfer format with precise amount', () => {
        const result = generateReceiveQrText({
          receiveAddress: testSolanaAddress,
          asset: wif,
          amountCryptoPrecision: '0.123456',
        })

        expect(result).toBe(
          `solana:${testSolanaAddress}?amount=0.123456&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
        )
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should throw error for empty receive address', () => {
      expect(() => {
        generateReceiveQrText({
          receiveAddress: '',
          asset: bitcoin,
          amountCryptoPrecision: '1.0',
        })
      }).toThrow(EMPTY_ADDRESS_ERROR)
    })

    it('should handle zero amounts for UTXO chains', () => {
      const result = generateReceiveQrText({
        receiveAddress: testBtcAddress,
        asset: bitcoin,
        amountCryptoPrecision: '0',
      })

      expect(result).toBe(`bitcoin:${testBtcAddress}?amount=0`)
    })

    it('should handle zero amounts for EVM chains', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: ethereum,
        amountCryptoPrecision: '0',
      })

      expect(result).toBe(`ethereum:${testAddress}@1?value=0`)
    })

    it('should handle very small amounts with proper precision', () => {
      const result = generateReceiveQrText({
        receiveAddress: testAddress,
        asset: usdc,
        amountCryptoPrecision: '0.000001',
      })

      expect(result).toBe(
        `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${testAddress}&uint256=1`,
      )
    })
  })
})
