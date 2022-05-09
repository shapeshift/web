import realFs from 'fs'

import {
  makeBtcData,
  makeCosmosHubData,
  makeOsmosisData,
  parseData,
  parseEthData,
  writeFiles
} from './utils'

const makeEthMockCoingeckoResponse = () => ({
  id: 'ethereum',
  symbol: 'eth',
  name: 'Ethereum',
  platforms: {
    'binance-smart-chain': '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    'huobi-token': '0x64ff637fb478863b7468bc97d30a5bf3a428a1fd',
    avalanche: '0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15',
    kardiachain: '0x1540020a94aa8bc189aa97639da213a4ca49d9a7',
    moonriver: '0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c',
    sora: '0x0200070000000000000000000000000000000000000000000000000000000000 ',
    'optimistic-ethereum': '0x4200000000000000000000000000000000000006',
    tomochain: '0x2eaa73bd0db20c64f53febea7b5f5e5bccc7fb8b'
  }
})

const makeFoxMockCoingeckoResponse = () => ({
  id: 'shapeshift-fox-token',
  symbol: 'fox',
  name: 'ShapeShift FOX Token',
  platforms: {
    ethereum: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  }
})

const makeBtcMockCoingeckoResponse = () => ({
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  platforms: {}
})

const makeCosmosMockCoingeckoResponse = () => ({
  id: 'cosmos',
  symbol: 'atom',
  name: 'Cosmos',
  platforms: {
    osmosis: 'IBC/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2'
  }
})

const makeOsmosisMockCoingeckoResponse = () => ({
  id: 'osmosis',
  symbol: 'osmo',
  name: 'osmosis',
  platforms: {}
})

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(async () => undefined)
  }
}))

describe('adapters:coingecko:utils', () => {
  describe('parseEthData', () => {
    it('can parse eth data', async () => {
      const result = parseEthData([makeEthMockCoingeckoResponse(), makeFoxMockCoingeckoResponse()])
      const expected = {
        'eip155:1/slip44:60': 'ethereum',
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'shapeshift-fox-token'
      }
      expect(result).toEqual(expected)
    })

    it('can parse btc data', async () => {
      const result = makeBtcData()
      const expected = { 'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin' }
      expect(result).toEqual(expected)
    })

    it('can parse cosmos data', async () => {
      const result = makeCosmosHubData()
      const expected = { 'cosmos:cosmoshub-4/slip44:118': 'cosmos' }
      expect(result).toEqual(expected)
    })

    it('can parse osmosis data', async () => {
      const result = makeOsmosisData()
      const expected = { 'cosmos:osmosis-1/slip44:118': 'osmosis' }
      expect(result).toEqual(expected)
    })
  })

  describe('parseData', () => {
    it('can parse all data', async () => {
      const result = parseData([
        makeEthMockCoingeckoResponse(),
        makeFoxMockCoingeckoResponse(),
        makeBtcMockCoingeckoResponse(),
        makeCosmosMockCoingeckoResponse(),
        makeOsmosisMockCoingeckoResponse()
      ])
      const expected = {
        'bip122:000000000019d6689c085ae165831e93': {
          'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin'
        },
        'cosmos:cosmoshub-4': {
          'cosmos:cosmoshub-4/slip44:118': 'cosmos'
        },
        'cosmos:osmosis-1': {
          'cosmos:osmosis-1/slip44:118': 'osmosis'
        },
        'eip155:1': {
          'eip155:1/slip44:60': 'ethereum',
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'shapeshift-fox-token'
        }
      }
      expect(result).toEqual(expected)
    })
  })

  describe('writeFiles', () => {
    it('can writeFiles', async () => {
      const data = {
        foo: {
          assetIdAbc: 'bitcorn',
          assetIdDef: 'efferium'
        },
        bar: {
          assetIdGhi: 'fox',
          assetIdJkl: 'shib'
        }
      }
      const fooAssetIds = JSON.stringify(data.foo)
      const barAssetIds = JSON.stringify(data.bar)
      console.info = jest.fn()
      await writeFiles(data)
      expect(realFs.promises.writeFile).toBeCalledWith(
        './src/adapters/coingecko/generated/foo/adapter.json',
        fooAssetIds
      )
      expect(realFs.promises.writeFile).toBeCalledWith(
        './src/adapters/coingecko/generated/bar/adapter.json',
        barAssetIds
      )
      expect(console.info).toBeCalledWith('Generated CoinGecko AssetId adapter data.')
    })
  })
})
