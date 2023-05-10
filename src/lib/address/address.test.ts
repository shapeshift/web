import {
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  ltcAssetId,
  ltcChainId,
} from '@shapeshiftoss/caip'

import { parseMaybeUrlWithChainId } from './address'

describe('lib/address', () => {
  describe('parseMaybeUrlWithChainId', () => {
    it('should not parse EIP-681 URL for ENS domain', () => {
      const input = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: 'vitalik.eth',
      }

      const expectedOutput = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: 'vitalik.eth',
      }

      expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
    })

    it('should parse address from EIP-681 URL without parameters', () => {
      const input = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      }

      const expectedOutput = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      }

      expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
    })

    it('should parse EIP-681 URL with dangerous parameters and strip them', () => {
      const input = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value:
          'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?dangerousParam=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
      }

      const expectedOutput = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      }

      expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
    })

    it('should parse EIP-681 URL with amount/value params', () => {
      const input = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value:
          'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?amount=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
      }

      const expectedOutput = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        amountCryptoPrecision: '2014000000000000000',
      }

      expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)

      const input2 = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value:
          'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?value=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
      }

      const expectedOutput2 = {
        assetId: ethAssetId,
        chainId: ethChainId,
        value: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
      }

      expect(parseMaybeUrlWithChainId(input2)).toEqual(expectedOutput2)
    })

    it('should parse address from BIP-21 URL with bitcoin URN scheme', () => {
      const input = {
        assetId: btcAssetId,
        chainId: btcChainId,
        value: 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar',
      }

      const expectedOutput = {
        assetId: btcAssetId,
        chainId: btcChainId,
        value: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
        amountCryptoPrecision: '20.3',
      }

      expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
    })

    it('should not parse address if there is a mismatch between chainId and URN scheme', () => {
      const input = {
        assetId: ltcAssetId,
        chainId: ltcChainId,
        value: 'dogecoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar',
      }

      const expectedOutput = {
        assetId: ltcAssetId,
        chainId: ltcChainId,
        value: 'dogecoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar',
      }

      expect(parseMaybeUrlWithChainId(input)).toEqual(expectedOutput)
    })
  })
})
