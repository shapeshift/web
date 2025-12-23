import type { Asset } from '@shapeshiftoss/types'
import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { getAssetService } from './AssetService'
import { descriptions } from './descriptions'

import { ethereum as EthAsset } from '@/test/mocks/assets'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('asset-manifest.json')) {
        return Promise.resolve({
          json: () => Promise.resolve({ assetData: 'test', relatedAssetIndex: 'test' }),
        } as Response)
      }
      if (url.includes('generatedAssetData.json')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              byId: {
                [EthAsset.assetId]: EthAsset,
              },
              ids: [EthAsset.assetId],
            }),
        } as Response)
      }
      if (url.includes('relatedAssetIndex.json')) {
        return Promise.resolve({
          json: () => Promise.resolve({}),
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    }),
  )
})

vi.mock('axios', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    default: mockAxios.default.create(),
  }
})

const mockedAxios = vi.mocked<AxiosInstance>(axios)

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
      const assetService = await getAssetService()

      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: 'overridden en description',
        isTrusted: true,
      })
    })

    it('should return the overridden description if it exists - locale', async () => {
      const assetService = await getAssetService()

      await expect(assetService.description(EthAsset.assetId, 'es')).resolves.toEqual({
        description: 'overridden es description',
        isTrusted: true,
      })
    })

    it('should return an english string if found', async () => {
      const locale = 'en'
      const assetDescriptions = descriptions[locale]
      delete assetDescriptions[EthAsset.assetId]

      const assetService = await getAssetService()
      const description = { en: 'a blue fox' }
      vi.mocked(mockedAxios.get).mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: description.en,
      })
    })

    it('should return a localized string if found', async () => {
      const locale = 'es'
      const assetDescriptions = descriptions[locale]
      delete assetDescriptions[EthAsset.assetId]

      const assetService = await getAssetService()
      const description = { en: 'a blue fox', es: '¿Qué dice el zorro?' }
      vi.mocked(mockedAxios.get).mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId, locale)).resolves.toEqual({
        description: description.es,
      })
    })

    it('should throw if not found', async () => {
      const assetService = await getAssetService()
      vi.mocked(mockedAxios.get).mockRejectedValue({ data: null })
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
