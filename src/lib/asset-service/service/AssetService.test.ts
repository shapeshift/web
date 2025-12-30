import type { Asset } from '@shapeshiftoss/types'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { getAssetService, initAssetService } from './AssetService'
import { descriptions } from './descriptions'

import { ethereum as EthAsset } from '@/test/mocks/assets'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

// Hoisted mock data so it's available in vi.mock factory
const mockData = vi.hoisted(() => ({
  assetData: {
    byId: {
      'bip122:000000000019d6689c085ae165831e93/slip44:0': {
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        symbol: 'BTC',
        name: 'Bitcoin',
        precision: 8,
        color: '#FF9800',
        icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
        relatedAssetKey: null,
      },
      'eip155:1/slip44:60': {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        symbol: 'ETH',
        name: 'Ethereum',
        precision: 18,
        color: '#FFFFFF',
        icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
        relatedAssetKey: null,
      },
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 'eip155:1',
        symbol: 'USDC',
        name: 'USD Coin',
        precision: 6,
        color: '#2775CA',
        icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        relatedAssetKey: null,
      },
    },
    ids: [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'eip155:1/slip44:60',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ],
  },
  relatedAssetIndex: {},
}))

vi.mock('axios', () => {
  const mockGet = (url: string) => {
    if (url.includes('asset-manifest.json')) {
      return Promise.resolve({ data: { assetData: 'test', relatedAssetIndex: 'test' } })
    }
    if (url.includes('generatedAssetData.json')) {
      return Promise.resolve({ data: mockData.assetData })
    }
    if (url.includes('relatedAssetIndex.json')) {
      return Promise.resolve({ data: mockData.relatedAssetIndex })
    }
    // Fall through to the mocked get for other URLs (like coingecko)
    return mocks.get(url)
  }

  return {
    default: {
      get: mockGet,
    },
  }
})

beforeAll(async () => {
  await initAssetService()
})

vi.mock('./descriptions', () => ({
  descriptions: {
    en: {
      'eip155:1/slip44:60': 'overridden en description',
    },
    es: {
      'eip155:1/slip44:60': 'overridden es description',
    },
    fr: {
      'eip155:1/slip44:60': 'overridden fr description',
    },
    id: {
      'eip155:1/slip44:60': 'overridden id description',
    },
    ko: {
      'eip155:1/slip44:60': 'overridden ko description',
    },
    pt: {
      'eip155:1/slip44:60': 'overridden pt description',
    },
    ru: {
      'eip155:1/slip44:60': 'overridden ru description',
    },
    zh: {
      'eip155:1/slip44:60': 'overridden zh description',
    },
  },
}))

describe('AssetService', () => {
  describe('description', () => {
    it('should return the overridden description if it exists - english default', async () => {
      const assetService = getAssetService()

      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: 'overridden en description',
        isTrusted: true,
      })
    })

    it('should return the overridden description if it exists - locale', async () => {
      const assetService = getAssetService()

      await expect(assetService.description(EthAsset.assetId, 'es')).resolves.toEqual({
        description: 'overridden es description',
        isTrusted: true,
      })
    })

    it('should return an english string if found', async () => {
      const locale = 'en'
      const assetDescriptions = descriptions[locale]
      delete assetDescriptions[EthAsset.assetId]

      const assetService = getAssetService()
      const description = { en: 'a blue fox' }
      mocks.get.mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: description.en,
      })
    })

    it('should return a localized string if found', async () => {
      const locale = 'es'
      const assetDescriptions = descriptions[locale]
      delete assetDescriptions[EthAsset.assetId]

      const assetService = getAssetService()
      const description = { en: 'a blue fox', es: '¿Qué dice el zorro?' }
      mocks.get.mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId, locale)).resolves.toEqual({
        description: description.es,
      })
    })

    it('should throw if not found', async () => {
      const assetService = getAssetService()
      mocks.get.mockRejectedValue({ data: null })
      const tokenData: Asset = {
        assetId: 'eip155:1/erc20:0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a',
        chainId: 'eip155:1',
        explorer: 'https://etherscan.io',
        explorerTxLink: 'https://etherscan.io/tx/',
        explorerAddressLink: 'https://etherscan.io/address/',
        name: 'Test Token',
        precision: 18,
        color: '#FFFFFF',
        icon: 'https://assets.coingecko.com/coins/images/17049/thumb/BUNNY.png?1626148809',
        symbol: 'TST',
        relatedAssetKey: null,
      }
      const expectedErrorMessage = `AssetService:description: no description available for ${tokenData.assetId}`
      await expect(assetService.description(tokenData.assetId)).rejects.toEqual(
        new Error(expectedErrorMessage),
      )
    })
  })
})
