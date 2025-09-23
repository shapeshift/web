import {
  bscChainId,
  btcAssetId,
  btcChainId,
  dogeAssetId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  ltcAssetId,
  ltcChainId,
  solanaChainId,
  solAssetId,
} from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import type { ParseAddressByChainIdOutput } from './address'
import { parseMaybeUrlWithChainId } from './address'

import { usdcAssetId } from '@/test/mocks/accounts'

describe('@/lib/address', () => {
  describe('parseMaybeUrlWithChainId', () => {
    describe('Trust Mobile', () => {
      it('should handle unsupported stellar: scheme', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'stellar:GADCG5ZWXLGQXVUXR4ZPJQLQ87XHTJV4JCTF8QFV5Z8LEZH4QRXB6ABC?amount=50',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress:
            'stellar:GADCG5ZWXLGQXVUXR4ZPJQLQ87XHTJV4JCTF8QFV5Z8LEZH4QRXB6ABC?amount=50',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse float amount param for EVM (non-compliant wallet handling)', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?amount=0.1',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
          amountCryptoPrecision: '0.1', // EVM floats treated as precision units for non-compliant wallets
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse amount as base unit for ERC-681', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x5678CDEF9012ABCD3456789ABCDEF012345678FE?amount=10',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x5678CDEF9012ABCD3456789ABCDEF012345678FE',
          amountCryptoPrecision: '0.00000000000000001', // 10 wei in ETH
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse amount as precision for BIP-21', () => {
        const input = {
          assetId: btcAssetId,
          chainId: btcChainId,
          urlOrAddress: 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.424242',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: btcAssetId,
          chainId: btcChainId,
          maybeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          amountCryptoPrecision: '0.424242',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse plain DOGE addresses', () => {
        const input = {
          assetId: dogeAssetId,
          chainId: dogeChainId,
          urlOrAddress: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: dogeAssetId,
          chainId: dogeChainId,
          maybeAddress: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse DOGE with BIP-21 amounts', () => {
        const input = {
          assetId: dogeAssetId,
          chainId: dogeChainId,
          urlOrAddress: 'doge:DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L?amount=42123',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: dogeAssetId,
          chainId: dogeChainId,
          maybeAddress: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
          amountCryptoPrecision: '42123',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })

    describe('MetaMask Mobile', () => {
      it('should not parse EIP-681 URL for ENS domain', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'vitalik.eth',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: 'vitalik.eth',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse address from EIP-681 URL without parameters', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse EIP-681 URL with dangerous parameters and strip them', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?dangerousParam=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse EIP-681 URL with amount/value params', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?amount=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
          amountCryptoPrecision: '2.014',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)

        const input2 = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?value=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
        }

        const expectedOutput2: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
          amountCryptoPrecision: '2.014',
        }

        expect(parseMaybeUrlWithChainId(input2)).toEqual(expectedOutput2)
      })

      it('should parse native EVM asset with amount and chain_id as hex', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@0x1?value=2014000000000000000',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
          amountCryptoPrecision: '2.014',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse ERC-20 token transfer with amount and destination', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD&uint256=100000',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: usdcAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
          amountCryptoPrecision: '0.1',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse regular address QR with chain_id as hex', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@0x1',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should throw error for ERC-20 token not in asset slice', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress:
            'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD/transfer?address=0xABCDEF1234567890ABCDEF1234567890ABCDEF12&uint256=1000000',
        }

        expect(() => parseMaybeUrlWithChainId(input)).toThrow(
          'modals.send.errors.qrDangerousEthUrl',
        )
      })

      it('should parse address from BIP-21 URL with bitcoin URN scheme', () => {
        const input = {
          assetId: btcAssetId,
          chainId: btcChainId,
          urlOrAddress: 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: btcAssetId,
          chainId: btcChainId,
          maybeAddress: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
          amountCryptoPrecision: '20.3',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should not parse address if there is a mismatch between chainId and URN scheme', () => {
        const input = {
          assetId: ltcAssetId,
          chainId: ltcChainId,
          urlOrAddress: 'dogecoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ltcAssetId,
          chainId: ltcChainId,
          maybeAddress: 'dogecoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })

    describe('Rabby Mobile', () => {
      it('should parse basic address QRs', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: '0x9A8B7C6D5E4F3A2B1C9D8E7F6A5B4C3D2E1F0987',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x9A8B7C6D5E4F3A2B1C9D8E7F6A5B4C3D2E1F0987',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse Zerion basic address QRs', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: '0x3F1B8C2D7E9A6F4B1D8C5A7E2F9B4C6D1E8A3F57',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x3F1B8C2D7E9A6F4B1D8C5A7E2F9B4C6D1E8A3F57',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })

    describe('BASE Mobile', () => {
      it('should parse mainnet receive QRs with ethereum: prefix', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x2E4A7F8B9C1D6E5A3B7C9F2E4D6A8B5C7E1F3A92',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x2E4A7F8B9C1D6E5A3B7C9F2E4D6A8B5C7E1F3A92',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })

    describe('Ledger Live', () => {
      it('should parse plain Ethereum addresses', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: '0x8F2A5B7E1C9D3A6F4E8B1D5C7A9F2E6B3D8C4A17',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x8F2A5B7E1C9D3A6F4E8B1D5C7A9F2E6B3D8C4A17',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse plain Bitcoin addresses', () => {
        const input = {
          assetId: btcAssetId,
          chainId: btcChainId,
          urlOrAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: btcAssetId,
          chainId: btcChainId,
          maybeAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })

    describe('Keplr', () => {
      it('should parse Ethereum mainnet with chain ID', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x7B4F2A9E8C1D5F3B6A2E7C9D4F1A8B5C3E6F9D42@0x1',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: '0x7B4F2A9E8C1D5F3B6A2E7C9D4F1A8B5C3E6F9D42',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse BSC with chain ID', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'ethereum:0x3A9F5C8E2B7D1F4A6C9E2B8D5F1A7C4E9B2F6A83@0x38',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId, // Note: Should get BSC asset ID but falls back to input assetId
          chainId: bscChainId, // 0x38 = 56 (BSC chain ID)
          maybeAddress: '0x3A9F5C8E2B7D1F4A6C9E2B8D5F1A7C4E9B2F6A83',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should handle unsupported Cosmos ATOM addresses gracefully', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: 'cosmos1x7k9m2p5w8q3r6v9c4n8b7f2a5x1e4r7t9y6u3',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should handle unsupported THORChain RUNE addresses gracefully', () => {
        const input = {
          assetId: ethAssetId,
          chainId: ethChainId,
          urlOrAddress: 'thor1w8x5m9k2p7q4v6n3c8b5f1a9r2e7t4y6u8i5o2',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: ethAssetId,
          chainId: ethChainId,
          maybeAddress: 'thor1w8x5m9k2p7q4v6n3c8b5f1a9r2e7t4y6u8i5o2',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })

    describe('Phantom', () => {
      it('should parse plain Solana addresses', () => {
        const input = {
          assetId: solAssetId,
          chainId: solanaChainId,
          urlOrAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: solAssetId,
          chainId: solanaChainId,
          maybeAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })

      it('should parse Solflare plain Solana addresses', () => {
        const input = {
          assetId: solAssetId,
          chainId: solanaChainId,
          urlOrAddress: 'GdnSyH3YtwcxFvQrVVJMm1JhTS4QVX7MFsX56uJLUfiZ',
        }

        const expectedOutput: ParseAddressByChainIdOutput = {
          assetId: solAssetId,
          chainId: solanaChainId,
          maybeAddress: 'GdnSyH3YtwcxFvQrVVJMm1JhTS4QVX7MFsX56uJLUfiZ',
        }

        expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
      })
    })
  })
})
