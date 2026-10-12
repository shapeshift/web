import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getAssetService, initAssetService } from './AssetService'
import { descriptions } from './descriptions'

import { ethereum as EthAsset } from '@/test/mocks/assets'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  fetchedUrls: [] as string[],
  shouldFailAssetData: false,
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
    mocks.fetchedUrls.push(url)

    if (url.includes('asset-manifest.json')) {
      return Promise.resolve({ data: { assetData: 'test', relatedAssetIndex: 'test' } })
    }
    if (url.includes('generatedAssetData.json')) {
      if (mocks.shouldFailAssetData) return Promise.reject(new Error('network error'))
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
  describe('init', () => {
    it('loads the generated assets in their sorted order', () => {
      const assetService = getAssetService()

      expect(assetService.assetIds).toEqual(mockData.assetData.ids)
      expect(assetService.assets.map(asset => asset.assetId)).toEqual(mockData.assetData.ids)
    })

    it('enriches assets with chain-level data and primary flags', () => {
      const usdc =
        getAssetService().assetsById['eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48']

      expect(usdc).toMatchObject({
        symbol: 'USDC',
        networkName: 'Ethereum',
        explorer: 'https://etherscan.io',
        explorerAddressLink: 'https://etherscan.io/address/',
        explorerTxLink: 'https://etherscan.io/tx/',
        isPrimary: true,
        isChainSpecific: true,
      })
    })
  })

  describe('with a fresh service', () => {
    const importAssetService = (commitHash: string) => {
      vi.stubEnv('VITE_COMMIT_HASH', commitHash)
      vi.resetModules()
      mocks.fetchedUrls.length = 0

      return import('./AssetService')
    }

    const hasFetchedAssetData = () =>
      mocks.fetchedUrls.some(url => url.includes('generatedAssetData.json'))

    afterEach(() => {
      vi.stubEnv('VITE_COMMIT_HASH', '')
      mocks.shouldFailAssetData = false
    })

    it('versions the assets by the build and the asset data hashes', async () => {
      const { getAssetService, initAssetService } = await importAssetService('abc1234')
      await initAssetService()

      expect(getAssetService().version).toBe('abc1234:test:test')
    })

    it('has no version for an unversioned build, so the assets are always reloaded', async () => {
      const { getAssetService, initAssetService } = await importAssetService('')
      const getLoadedAssets = vi.fn()
      await initAssetService(getLoadedAssets)

      expect(getAssetService().version).toBeUndefined()
      expect(getLoadedAssets).not.toHaveBeenCalled()
      expect(hasFetchedAssetData()).toBe(true)
    })

    it('uses the assets already loaded from its version without fetching the asset data', async () => {
      const { getAssetService, initAssetService } = await importAssetService('abc1234')
      const loadedAssets = {
        assetsById: { [EthAsset.assetId]: EthAsset },
        assetIds: [EthAsset.assetId],
        relatedAssetIndex: { [EthAsset.assetId]: [EthAsset.assetId] },
      }
      const getLoadedAssets = vi.fn().mockReturnValue(loadedAssets)

      await initAssetService(getLoadedAssets)

      const assetService = getAssetService()
      expect(getLoadedAssets).toHaveBeenCalledWith('abc1234:test:test')
      expect(hasFetchedAssetData()).toBe(false)
      expect(assetService.assetsById).toBe(loadedAssets.assetsById)
      expect(assetService.assetIds).toEqual([EthAsset.assetId])
      expect(assetService.assets).toEqual([EthAsset])
      expect(assetService.relatedAssetIndex).toBe(loadedAssets.relatedAssetIndex)
    })

    it('fetches the asset data when none is loaded from its version', async () => {
      const { getAssetService, initAssetService } = await importAssetService('abc1234')

      await initAssetService(() => undefined)

      expect(hasFetchedAssetData()).toBe(true)
      expect(getAssetService().assetIds).toEqual(mockData.assetData.ids)
    })

    it('can be retried after a failed load', async () => {
      const { getAssetService, initAssetService } = await importAssetService('abc1234')

      mocks.shouldFailAssetData = true
      await expect(initAssetService()).rejects.toThrow('network error')
      expect(getAssetService().assetIds).toEqual([])

      mocks.shouldFailAssetData = false
      await initAssetService()

      expect(getAssetService().assetIds).toEqual(mockData.assetData.ids)
      expect(getAssetService().version).toBe('abc1234:test:test')
    })
  })

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
      const assetId = 'eip155:1/erc20:0x1da00b6fc705f2ce4c25d7e7add25a3cc045e54a'

      await expect(assetService.description(assetId)).rejects.toEqual(
        new Error(`AssetService:description: no description available for ${assetId}`),
      )
    })
  })
})
