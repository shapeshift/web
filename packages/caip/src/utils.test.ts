import { ChainNamespace, ChainReference } from 'packages/caip/src/chainId/chainId'

import {
  ASSET_NAMESPACE_STRINGS,
  ASSET_REFERENCE,
  btcAssetId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosAssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  osmosisAssetId,
  osmosisChainId
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
  isChainReference
} from './typeGuards'
import {
  accountIdToChainId,
  accountIdToSpecifier,
  chainIdToFeeAssetId,
  getFeeAssetIdFromAssetId,
  isValidChainPartsPair
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

describe('chainIdToFeeAssetId', () => {
  it('returns a chain fee assetId for a given Ethereum chainId', () => {
    const result = chainIdToFeeAssetId(ethChainId)
    expect(result).toEqual(ethAssetId)
  })

  it('returns chain fee assetId (ATOM) for a given Cosmos chainId', () => {
    const result = chainIdToFeeAssetId(cosmosChainId)
    expect(result).toEqual(cosmosAssetId)
  })
})

describe('getFeeAssetIdFromAssetId', () => {
  it('returns a ETH fee assetId (ETH) for a given ETH/ERC20 assetId', () => {
    const erc20AssetId = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'
    const feeAssetId = 'eip155:1/slip44:60'
    const result = getFeeAssetIdFromAssetId(erc20AssetId)
    expect(result).toEqual(feeAssetId)
  })

  it('returns Cosmos fee assetId (ATOM) for a given Cosmos assetId', () => {
    const junoAssetId =
      'cosmos:cosmoshub-4/ibc:46B44899322F3CD854D2D46DEEF881958467CDD4B3B10086DA49296BBED94BED'
    const result = getFeeAssetIdFromAssetId(junoAssetId)
    expect(result).toEqual(cosmosAssetId)
  })
})

describe('isValidChainPartsPair', () => {
  it('correctly validates pairs', () => {
    expect(isValidChainPartsPair(CHAIN_NAMESPACE.Bitcoin, CHAIN_REFERENCE.BitcoinTestnet)).toEqual(
      true
    )
    expect(isValidChainPartsPair(CHAIN_NAMESPACE.Ethereum, CHAIN_REFERENCE.BitcoinTestnet)).toEqual(
      false
    )
    expect(
      isValidChainPartsPair('invalid' as ChainNamespace, CHAIN_REFERENCE.BitcoinTestnet)
    ).toEqual(false)
    expect(isValidChainPartsPair(CHAIN_NAMESPACE.Ethereum, 'invalid' as ChainReference)).toEqual(
      false
    )
  })
})

describe('type guard', () => {
  describe('isChainNamespace', () => {
    it('correctly determines type', () => {
      expect(isChainNamespace(CHAIN_NAMESPACE.Bitcoin)).toEqual(true)
      expect(isChainNamespace(CHAIN_NAMESPACE.Ethereum)).toEqual(true)
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
      expect(isChainId(osmosisChainId)).toEqual(true)
      expect(isChainId('invalid')).toEqual(false)
      expect(isChainId('')).toEqual(false)
    })
  })

  describe('isAssetNamespace', () => {
    it('correctly determines type', () => {
      expect(isAssetNamespace(ASSET_NAMESPACE_STRINGS[0])).toEqual(true)
      expect(isAssetNamespace(ASSET_NAMESPACE_STRINGS[1])).toEqual(true)
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
      expect(isAssetId(osmosisAssetId)).toEqual(true)
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
      expect(() => assertIsChainId(osmosisChainId)).not.toThrow()
      expect(() => assertIsChainId('invalid')).toThrow()
      expect(() => assertIsChainId('')).toThrow()
    })
  })

  describe('assertIsChainNamespace', () => {
    it('correctly asserts type', () => {
      expect(() => assertIsChainNamespace(CHAIN_NAMESPACE.Bitcoin)).not.toThrow()
      expect(() => assertIsChainNamespace(CHAIN_NAMESPACE.Ethereum)).not.toThrow()
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
      expect(() => assertIsAssetNamespace(ASSET_NAMESPACE_STRINGS[0])).not.toThrow()
      expect(() => assertIsAssetNamespace(ASSET_NAMESPACE_STRINGS[1])).not.toThrow()
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
        assertValidChainPartsPair(CHAIN_NAMESPACE.Bitcoin, CHAIN_REFERENCE.BitcoinTestnet)
      ).not.toThrow()
      expect(() =>
        assertValidChainPartsPair(CHAIN_NAMESPACE.Bitcoin, CHAIN_REFERENCE.EthereumMainnet)
      ).toThrow()
      expect(() =>
        assertValidChainPartsPair('invalid' as ChainNamespace, CHAIN_REFERENCE.BitcoinTestnet)
      ).toThrow()
      expect(() =>
        assertValidChainPartsPair(CHAIN_NAMESPACE.Ethereum, 'invalid' as ChainReference)
      ).toThrow()
    })
  })
})
