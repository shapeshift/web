import realFs from 'fs'

import { bitcoinAssetMap, cosmosAssetMap, osmosisAssetMap } from '../../utils'
import { parseData, writeFiles } from './utils'

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
    tomochain: '0x2eaa73bd0db20c64f53febea7b5f5e5bccc7fb8b',
  },
})

const makeAvalancheMockCoingeckoResponse = () => ({
  id: 'avalanche-2',
  symbol: 'avax',
  name: 'Avalanche',
  platforms: {
    avalanche: 'FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGCgxN5Z',
    'defi-kingdoms-blockchain': '0xb57b60debdb0b8172bb6316a9164bd3c695f133a',
    'milkomeda-cardano': '0x65e66a61d0a8f1e686c2d6083ad611a10d84d97a',
    'polygon-pos': '0x2c89bbc92bd86f8075d1decc58c7f4e0107f286b',
    moonbeam: '0x4792c1ecb969b036eb51330c63bd27899a13d84e',
    'harmony-shard-0': 'one14tvk6p8spdcch8k58cuahrnnmesua79he3xzld',
    solana: '7JnHPPJBBKSTJ7iEmsiGSBcPJgbcKw28uCRXtQgimncp',
    moonriver: '0x14a0243c333a5b238143068dc3a7323ba4c30ecb',
  },
})

const makeFoxMockCoingeckoResponse = () => ({
  id: 'shapeshift-fox-token',
  symbol: 'fox',
  name: 'ShapeShift FOX Token',
  platforms: {
    ethereum: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  },
})

const makeBtcMockCoingeckoResponse = () => ({
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  platforms: {},
})

const makeCosmosMockCoingeckoResponse = () => ({
  id: 'cosmos',
  symbol: 'atom',
  name: 'Cosmos',
  platforms: {
    osmosis: 'IBC/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
  },
})

const makeOsmosisMockCoingeckoResponse = () => ({
  id: 'osmosis',
  symbol: 'osmo',
  name: 'osmosis',
  platforms: {},
})

const makeThorchainMockCoingeckoResponse = () => ({
  id: 'thorchain',
  symbol: 'rune',
  name: 'THORChain',
  platforms: {
    thorchain: '',
  },
})

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(async () => undefined),
  },
}))

describe('adapters:coingecko:utils', () => {
  describe('makeData', () => {
    it('can make btc data', async () => {
      const result = bitcoinAssetMap
      const expected = { 'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin' }
      expect(result).toEqual(expected)
    })

    it('can make cosmos data', async () => {
      const result = cosmosAssetMap
      const expected = { 'cosmos:cosmoshub-4/slip44:118': 'cosmos' }
      expect(result).toEqual(expected)
    })

    it('can make osmosis data', async () => {
      const result = osmosisAssetMap
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
        makeOsmosisMockCoingeckoResponse(),
        makeThorchainMockCoingeckoResponse(),
        makeAvalancheMockCoingeckoResponse(),
      ])
      const expected = {
        'bip122:000000000019d6689c085ae165831e93': {
          'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin',
        },
        'bip122:000000000000000000651ef99cb9fcbe': {
          'bip122:000000000000000000651ef99cb9fcbe/slip44:145': 'bitcoin-cash',
        },
        'bip122:00000000001a91e3dace36e2be3bf030': {
          'bip122:00000000001a91e3dace36e2be3bf030/slip44:3': 'dogecoin',
        },
        'bip122:12a765e31ffd4059bada1e25190f6e98': {
          'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2': 'litecoin',
        },
        'cosmos:cosmoshub-4': {
          'cosmos:cosmoshub-4/slip44:118': 'cosmos',
        },
        'cosmos:osmosis-1': {
          'cosmos:osmosis-1/slip44:118': 'osmosis',
        },
        'cosmos:thorchain-mainnet-v1': {
          'cosmos:thorchain-mainnet-v1/slip44:931': 'thorchain',
        },
        'eip155:1': {
          'eip155:1/slip44:60': 'ethereum',
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'shapeshift-fox-token',
        },
        'eip155:43114': {
          'eip155:43114/slip44:60': 'avalanche-2',
          'eip155:43114/erc20:0xf20d962a6c8f70c731bd838a3a388d7d48fa6e15': 'ethereum',
        },
      }
      expect(result).toEqual(expected)
    })
  })

  describe('writeFiles', () => {
    it('can writeFiles', async () => {
      const data = {
        foo: {
          assetIdAbc: 'bitcorn',
          assetIdDef: 'efferium',
        },
        bar: {
          assetIdGhi: 'fox',
          assetIdJkl: 'shib',
        },
      }
      const fooAssetIds = JSON.stringify(data.foo)
      const barAssetIds = JSON.stringify(data.bar)
      console.info = jest.fn()
      await writeFiles(data)
      expect(realFs.promises.writeFile).toHaveBeenNthCalledWith(
        1,
        './src/adapters/coingecko/generated/foo/adapter.json',
        fooAssetIds,
      )
      expect(realFs.promises.writeFile).toHaveBeenNthCalledWith(
        2,
        './src/adapters/coingecko/generated/bar/adapter.json',
        barAssetIds,
      )
      expect(console.info).toBeCalledWith('Generated CoinGecko AssetId adapter data.')
    })
  })
})
