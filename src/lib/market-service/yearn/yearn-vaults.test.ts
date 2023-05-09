import { CHAIN_NAMESPACE, CHAIN_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'

import { YearnVaultMarketCapService } from './yearn-vaults'
import { mockYearnGQLData, mockYearnVaultRestData } from './yearnMockData'

jest.mock('@yfi/sdk')

const mockedYearnSdk = jest.fn(() => ({
  vaults: {
    get: jest.fn(addresses => {
      return Promise.resolve(
        addresses
          ? mockYearnVaultRestData.filter(datum => addresses.includes(datum.address))
          : mockYearnVaultRestData,
      )
    }),
  },
  services: {
    subgraph: {
      fetchQuery: jest.fn(() => Promise.resolve(mockYearnGQLData)),
    },
  },
}))()

// @ts-ignore
const yearnVaultMarketCapService = new YearnVaultMarketCapService({ yearnSdk: mockedYearnSdk })

describe('yearn market service', () => {
  describe('findAll', () => {
    it('can flatten multiple responses', async () => {
      const result = await yearnVaultMarketCapService.findAll()
      expect(Object.keys(result).length).toEqual(2)
    })

    it('can sort by tvl', async () => {
      const yvBTCAddress = '0x19D3364A399d251E894aC732651be8B0E4e85001'
      const result = await yearnVaultMarketCapService.findAll()
      expect(Object.keys(result)[0]).toEqual(
        toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference: CHAIN_REFERENCE.EthereumMainnet,
          assetNamespace: 'erc20',
          assetReference: yvBTCAddress.toLowerCase(),
        }),
      )
    })

    it('can handle api errors', async () => {
      mockedYearnSdk.vaults.get.mockRejectedValueOnce({ error: 'foo' } as never)
      const result = await yearnVaultMarketCapService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can handle rate limiting', async () => {
      mockedYearnSdk.vaults.get.mockResolvedValueOnce({ status: 429 } as never)
      const result = await yearnVaultMarketCapService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can use default args', async () => {
      await yearnVaultMarketCapService.findAll()
      expect(mockedYearnSdk.vaults.get).toHaveBeenCalledTimes(1)
    })

    it('can use override args', async () => {
      const count = 1
      const result = await yearnVaultMarketCapService.findAll({ count })
      expect(mockedYearnSdk.vaults.get).toHaveBeenCalledTimes(1)
      expect(Object.keys(result).length).toEqual(1)
    })

    it('can map yearn to AssetIds', async () => {
      const result = await yearnVaultMarketCapService.findAll()
      const yvBtcAssetId = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace: 'erc20',
        assetReference: mockYearnVaultRestData[0].address.toLowerCase(),
      })
      const yvDaiAssetId = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace: 'erc20',
        assetReference: mockYearnVaultRestData[1].address.toLowerCase(),
      })
      const [yvDaiKey, yvBtcKey] = Object.keys(result)
      expect(yvDaiKey).toEqual(yvDaiAssetId)
      expect(yvBtcKey).toEqual(yvBtcAssetId)
    })
  })

  describe('findByAssetId', () => {
    const args = {
      assetId: 'eip155:1/erc20:0x19d3364a399d251e894ac732651be8b0e4e85001', // yvDai
    }
    it('should return market data for yvDai', async () => {
      const result = {
        price: '1.084750123794815921',
        marketCap: '3754148.94',
        changePercent24Hr: 0.00467104804294,
        volume: '100000',
      }
      expect(await yearnVaultMarketCapService.findByAssetId(args)).toEqual(result)
    })

    it('should return null on network error', async () => {
      mockedYearnSdk.vaults.get.mockRejectedValueOnce(Error as never)
      await expect(yearnVaultMarketCapService.findByAssetId(args)).rejects.toEqual(
        new Error('YearnMarketService(findByAssetId): error fetching market data'),
      )
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    const args = {
      assetId: 'eip155:1/erc20:0x19d3364a399d251e894ac732651be8b0e4e85001', // yvDai
      timeframe: HistoryTimeframe.WEEK,
    }

    it('should return market history data for yvDai', async () => {
      const expected = [
        { date: 1639132035000, price: 1.082051 },
        { date: 1639241453000, price: 1.082124 },
        { date: 1639269839000, price: 1.082084 },
        { date: 1639441831000, price: 1.085204 },
        { date: 1639530562000, price: 1.085871 },
      ]
      expect(await yearnVaultMarketCapService.findPriceHistoryByAssetId(args)).toEqual(expected)
    })

    it('should return null on network error', async () => {
      mockedYearnSdk.services.subgraph.fetchQuery.mockRejectedValueOnce(Error as never)
      await expect(yearnVaultMarketCapService.findPriceHistoryByAssetId(args)).rejects.toEqual(
        new Error('YearnMarketService(getPriceHistory): error fetching price history'),
      )
    })
  })
})
