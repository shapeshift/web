import axios from 'axios'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { AssetService, flattenAssetData, indexAssetData } from './AssetService'
import { mockBaseAssets, mockAssets, mockIndexedAssetData } from './AssetServiceTestData'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('AssetService', () => {
  const assetFileUrl = 'http://example.com'
  describe('utilities', () => {
    describe('flattenAssetData', () => {
      it('should flatten data correctly', () => {
        expect(flattenAssetData(mockBaseAssets)).toEqual(mockAssets)
      })
    })
    describe('indexAssetData', () => {
      it('should index data correctly', () => {
        expect(indexAssetData(flattenAssetData(mockBaseAssets))).toEqual(mockIndexedAssetData)
      })
    })
  })

  describe('byNetwork', () => {
    it('should throw if not initialized', () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      expect(() => assetService.byNetwork(NetworkTypes.MAINNET)).toThrow(Error)
    })

    it('should return assets by network', async () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      await assetService.initialize()
      const ethAssets = assetService.byNetwork(NetworkTypes.MAINNET)
      expect(ethAssets).toEqual(
        Object.values(mockIndexedAssetData).filter((a: Asset) => a.network === NetworkTypes.MAINNET)
      )
    })

    it('should return assets from all networks', async () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      await assetService.initialize()
      const ethAssets = assetService.byNetwork()
      expect(ethAssets).toEqual(Object.values(mockIndexedAssetData))
    })
  })

  describe('byTokenId', () => {
    const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
    it('should throw if not initialized', () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const args = { chain, network, tokenId }
      expect(() => assetService.byTokenId(args)).toThrow(Error)
    })

    it('should return base asset for chain given no tokenId', async () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      await assetService.initialize()
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const args = { chain, network }
      expect(assetService.byTokenId(args)).toEqual(
        Object.values(mockIndexedAssetData).find(
          ({ name, network: assetNetwork }: Asset) =>
            name === 'Ethereum' && assetNetwork === NetworkTypes.MAINNET
        )
      )
    })

    it(`should return FOX on ${NetworkTypes.TESTNET} when specified`, async () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      await assetService.initialize()
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.TESTNET
      const args = { chain, network, tokenId }
      expect(assetService.byTokenId(args)).toEqual(
        Object.values(mockIndexedAssetData).find(
          ({ tokenId: assetTokenId, network: assetNetwork }: Asset) =>
            assetTokenId === tokenId && assetNetwork === NetworkTypes.TESTNET
        )
      )
    })

    it(`should return FOX on ${NetworkTypes.MAINNET} when specified`, async () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockResolvedValue({ data: mockBaseAssets })
      await assetService.initialize()
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const args = { chain, network, tokenId }
      expect(assetService.byTokenId(args)).toEqual(
        Object.values(mockIndexedAssetData).find(
          ({ tokenId: assetTokenId, network: assetNetwork }: Asset) =>
            assetTokenId === tokenId && assetNetwork === NetworkTypes.MAINNET
        )
      )
    })
  })

  describe('description', () => {
    it('should return a string if found', async () => {
      const assetService = new AssetService(assetFileUrl)
      const description = { en: 'a blue fox' }
      mockedAxios.get.mockResolvedValue({ data: { description } })
      await expect(assetService.description(ChainTypes.Ethereum, '')).resolves.toEqual(
        description.en
      )
    })

    it('should throw if not found', async () => {
      const assetService = new AssetService(assetFileUrl)
      mockedAxios.get.mockRejectedValue({ data: null })
      const chain = ChainTypes.Ethereum
      const tokenId = 'fooo'
      const expectedErrorMessage = `AssetService:description: no description availble for ${tokenId} on chain ${chain}`
      await expect(assetService.description(chain, tokenId)).rejects.toEqual(
        new Error(expectedErrorMessage)
      )
    })
  })
})
