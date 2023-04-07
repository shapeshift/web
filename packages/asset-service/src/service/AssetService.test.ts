import axios from 'axios'

import { Asset, AssetService } from './AssetService'
import descriptions from './descriptions'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

const EthAsset: Asset = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
  explorer: 'https://etherscan.io/',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

jest.mock(
  './descriptions',
  () => ({
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
  }),
  { virtual: true },
)

jest.mock(
  './generatedAssetData.json',
  () => ({
    'eip155:1/slip44:60': {
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
    },
  }),
  { virtual: true },
)

describe('AssetService', () => {
  describe('description', () => {
    it('should return the overridden description if it exists - english default', async () => {
      const assetService = new AssetService()

      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: 'overridden en description',
        isTrusted: true,
      })
    })

    it('should return the overridden description if it exists - locale', async () => {
      const assetService = new AssetService()

      await expect(assetService.description(EthAsset.assetId, 'es')).resolves.toEqual({
        description: 'overridden es description',
        isTrusted: true,
      })
    })

    it('should return an english string if found', async () => {
      const locale = 'en'
      const assetDescriptions = descriptions[locale]
      delete assetDescriptions[EthAsset.assetId]

      const assetService = new AssetService()
      const description = { en: 'a blue fox' }
      mockedAxios.get.mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId)).resolves.toEqual({
        description: description.en,
      })
    })

    it('should return a localized string if found', async () => {
      const locale = 'es'
      const assetDescriptions = descriptions[locale]
      delete assetDescriptions[EthAsset.assetId]

      const assetService = new AssetService()
      const description = { en: 'a blue fox', es: '¿Qué dice el zorro?' }
      mockedAxios.get.mockResolvedValue({ data: { description } })
      await expect(assetService.description(EthAsset.assetId, locale)).resolves.toEqual({
        description: description.es,
      })
    })

    it('should throw if not found', async () => {
      const assetService = new AssetService()
      mockedAxios.get.mockRejectedValue({ data: null })
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
      }
      const expectedErrorMessage = `AssetService:description: no description available for ${tokenData.assetId}`
      await expect(assetService.description(tokenData.assetId)).rejects.toEqual(
        new Error(expectedErrorMessage),
      )
    })
  })
})
