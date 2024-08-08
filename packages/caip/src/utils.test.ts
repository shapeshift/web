import { describe, expect, it } from 'vitest'

import { toAssetId } from './assetId/assetId'
import type { ChainNamespace, ChainReference } from './chainId/chainId'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  btcAssetId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosAssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
} from './constants'
import {
  assertIsAssetNamespace,
  assertIsAssetReference,
  assertIsChainId,
  assertIsChainNamespace,
  assertIsChainReference,
  assertValidChainPartsPair,
  isAssetId,
  isAssetNamespace,
  isAssetReference,
  isChainId,
  isChainNamespace,
  isChainReference,
} from './typeGuards'
import {
  accountIdToChainId,
  accountIdToSpecifier,
  generateAssetIdFromCosmosSdkDenom,
  isValidChainPartsPair,
} from './utils'

describe('accountIdToChainId', () => {
  it('can get eth chainId from accountId', () => {
    const accountId = 'eip155:1:0xdef1cafe'
    const chainId = accountIdToChainId(accountId)
    expect(chainId).toEqual(ethChainId)
  })

  it('can get btc chainId from accountId', () => {
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const chainId = accountIdToChainId(accountId)
    expect(chainId).toEqual(btcChainId)
  })
})

describe('accountIdToSpecifier', () => {
  it('can get eth address from accountId', () => {
    const address = '0xdef1cafe'
    const accountId = 'eip155:1:0xdef1cafe'
    const result = accountIdToSpecifier(accountId)
    expect(result).toEqual(address)
  })

  it('can get xpub from accountId', () => {
    const xpub = 'xpubfoobarbaz'
    const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz'
    const result = accountIdToSpecifier(accountId)
    expect(result).toEqual(xpub)
  })
})

describe('isValidChainPartsPair', () => {
  it('correctly validates pairs', () => {
    expect(isValidChainPartsPair(CHAIN_NAMESPACE.Utxo, CHAIN_REFERENCE.BitcoinTestnet)).toEqual(
      true,
    )
    expect(isValidChainPartsPair(CHAIN_NAMESPACE.Evm, CHAIN_REFERENCE.BitcoinTestnet)).toEqual(
      false,
    )
    expect(
      isValidChainPartsPair('invalid' as ChainNamespace, CHAIN_REFERENCE.BitcoinTestnet),
    ).toEqual(false)
    expect(isValidChainPartsPair(CHAIN_NAMESPACE.Evm, 'invalid' as ChainReference)).toEqual(false)
  })
})

describe('type guard', () => {
  describe('isChainNamespace', () => {
    it('correctly determines type', () => {
      expect(isChainNamespace(CHAIN_NAMESPACE.Utxo)).toEqual(true)
      expect(isChainNamespace(CHAIN_NAMESPACE.Evm)).toEqual(true)
      expect(isChainNamespace('invalid')).toEqual(false)
      expect(isChainNamespace('')).toEqual(false)
    })
  })

  describe('isChainReference', () => {
    it('correctly determines type', () => {
      expect(isChainReference(CHAIN_REFERENCE.EthereumMainnet)).toEqual(true)
      expect(isChainReference(CHAIN_REFERENCE.BitcoinTestnet)).toEqual(true)
      expect(isChainReference('invalid')).toEqual(false)
      expect(isChainReference('')).toEqual(false)
    })
  })

  describe('isValidChainId', () => {
    it('correctly determines type', () => {
      expect(isChainId(ethChainId)).toEqual(true)
      expect(isChainId(btcChainId)).toEqual(true)
      expect(isChainId(cosmosChainId)).toEqual(true)
      expect(isChainId('invalid')).toEqual(false)
      expect(isChainId('')).toEqual(false)
    })
  })

  describe('isAssetNamespace', () => {
    it('correctly determines type', () => {
      expect(isAssetNamespace(ASSET_NAMESPACE.erc20)).toEqual(true)
      expect(isAssetNamespace(ASSET_NAMESPACE.erc721)).toEqual(true)
      expect(isAssetNamespace('invalid')).toEqual(false)
      expect(isAssetNamespace('')).toEqual(false)
    })
  })

  describe('isAssetReference', () => {
    it('correctly determines type', () => {
      expect(isAssetReference(ASSET_REFERENCE.Bitcoin)).toEqual(true)
      expect(isAssetReference(ASSET_REFERENCE.Ethereum)).toEqual(true)
      expect(isAssetReference('invalid')).toEqual(false)
      expect(isAssetReference('')).toEqual(false)
    })
  })

  describe('isAssetId', () => {
    it('correctly determines type', () => {
      expect(isAssetId(btcAssetId)).toEqual(true)
      expect(isAssetId(ethAssetId)).toEqual(true)
      expect(isAssetId(cosmosAssetId)).toEqual(true)
      expect(isAssetId('invalid')).toEqual(false)
      expect(isAssetId('')).toEqual(false)
    })
  })
})

describe('type guard assertion', () => {
  describe('assertIsChainId', () => {
    it('correctly asserts type', () => {
      expect(() => assertIsChainId(ethChainId)).not.toThrow()
      expect(() => assertIsChainId(btcChainId)).not.toThrow()
      expect(() => assertIsChainId(cosmosChainId)).not.toThrow()
      expect(() => assertIsChainId('invalid')).toThrow()
      expect(() => assertIsChainId('')).toThrow()
    })
  })

  describe('assertIsChainNamespace', () => {
    it('correctly asserts type', () => {
      expect(() => assertIsChainNamespace(CHAIN_NAMESPACE.Utxo)).not.toThrow()
      expect(() => assertIsChainNamespace(CHAIN_NAMESPACE.Evm)).not.toThrow()
      expect(() => assertIsChainNamespace('invalid')).toThrow()
      expect(() => assertIsChainNamespace('')).toThrow()
    })
  })

  describe('assertIsChainReference', () => {
    it('correctly asserts type', () => {
      expect(() => assertIsChainReference(CHAIN_REFERENCE.EthereumMainnet)).not.toThrow()
      expect(() => assertIsChainReference(CHAIN_REFERENCE.BitcoinTestnet)).not.toThrow()
      expect(() => assertIsChainReference('invalid')).toThrow()
      expect(() => assertIsChainReference('')).toThrow()
    })
  })

  describe('assertIsAssetNamespace', () => {
    it('correctly asserts type', () => {
      expect(() => assertIsAssetNamespace(ASSET_NAMESPACE.erc20)).not.toThrow()
      expect(() => assertIsAssetNamespace(ASSET_NAMESPACE.erc721)).not.toThrow()
      expect(() => assertIsAssetNamespace('invalid')).toThrow()
      expect(() => assertIsAssetNamespace('')).toThrow()
    })
  })

  describe('assertIsAssetReference', () => {
    it('correctly asserts type', () => {
      expect(() => assertIsAssetReference(ASSET_REFERENCE.Bitcoin)).not.toThrow()
      expect(() => assertIsAssetReference(ASSET_REFERENCE.Ethereum)).not.toThrow()
      expect(() => assertIsAssetReference('invalid')).toThrow()
      expect(() => assertIsAssetReference('')).toThrow()
    })
  })

  describe('assertValidChainPartsPair', () => {
    it('correctly asserts type', () => {
      expect(() =>
        assertValidChainPartsPair(CHAIN_NAMESPACE.Utxo, CHAIN_REFERENCE.BitcoinTestnet),
      ).not.toThrow()
      expect(() =>
        assertValidChainPartsPair(CHAIN_NAMESPACE.Utxo, CHAIN_REFERENCE.EthereumMainnet),
      ).toThrow()
      expect(() =>
        assertValidChainPartsPair('invalid' as ChainNamespace, CHAIN_REFERENCE.BitcoinTestnet),
      ).toThrow()
      expect(() =>
        assertValidChainPartsPair(CHAIN_NAMESPACE.Evm, 'invalid' as ChainReference),
      ).toThrow()
    })
  })
  describe('generateAssetIdFromCosmosDenom', () => {
    it('correctly generates ATOM native asset id', () => {
      const nativeAssetId = toAssetId({
        assetNamespace: ASSET_NAMESPACE.slip44,
        assetReference: ASSET_REFERENCE.Cosmos,
        chainId: cosmosChainId,
      })
      const result = generateAssetIdFromCosmosSdkDenom('uatom', cosmosAssetId)
      expect(result).toEqual(nativeAssetId)
    })
    it('correctly generates cosmoshub IBC asset id', () => {
      const ibcAssetId = toAssetId({
        assetNamespace: ASSET_NAMESPACE.ibc,
        assetReference: '14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
        chainId: cosmosChainId,
      })
      const result = generateAssetIdFromCosmosSdkDenom(
        'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
        cosmosAssetId,
      )
      expect(result).toEqual(ibcAssetId)
    })
  })
})
