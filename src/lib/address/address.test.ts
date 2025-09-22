import {
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  ltcAssetId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import type { ParseAddressByChainIdOutput } from './address'
import { parseMaybeUrlWithChainId } from './address'
import { usdcAssetId } from '@/test/mocks/accounts'

describe('@/lib/address', () => {
  describe('parseMaybeUrlWithChainId', () => {
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

    it('should throw error for ERC-20 token not in asset registry', () => {
      const input = {
        assetId: ethAssetId,
        chainId: ethChainId,
        urlOrAddress:
          'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD/transfer?address=0xABCDEF1234567890ABCDEF1234567890ABCDEF12&uint256=1000000',
      }

      expect(() => parseMaybeUrlWithChainId(input)).toThrow('modals.send.errors.qrDangerousEthUrl')
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
})
