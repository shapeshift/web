import realFs from 'fs'
import { describe, expect, it, vi } from 'vitest'

import { bitcoinAssetMap, cosmosAssetMap } from '../../utils'
import { parseData, writeFiles } from './utils'

const makeEthMockCoingeckoResponse = () => ({
  id: 'ethereum',
  symbol: 'eth',
  platforms: {},
})

const makeWethMockCoingeckoResponse = () => ({
  id: 'weth',
  symbol: 'weth',
  name: 'WETH',
  platforms: {
    ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    'optimistic-ethereum': '0x4200000000000000000000000000000000000006',
    avalanche: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
    'binance-smart-chain': '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    'polygon-pos': '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    xdai: '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
    'arbitrum-one': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    'arbitrum-nova': '0x722e8bdd2ce80a4422e880164f2079488e115365',
    base: '0x4200000000000000000000000000000000000006',
  },
})

const makeAvalancheMockCoingeckoResponse = () => ({
  id: 'avalanche-2',
  symbol: 'avax',
  platforms: {},
})

const makeFoxMockCoingeckoResponse = () => ({
  id: 'shapeshift-fox-token',
  symbol: 'fox',
  platforms: {
    ethereum: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  },
})

const makeBtcMockCoingeckoResponse = () => ({
  id: 'bitcoin',
  symbol: 'btc',
  platforms: {},
})

const makeCosmosMockCoingeckoResponse = () => ({
  id: 'cosmos',
  symbol: 'atom',
  platforms: {},
})

const makePolygonMockCoingeckoResponse = () => ({
  id: 'polygon-pos',
  symbol: 'matic',
  platforms: {},
})

const makeGnosisMockCoingeckoResponse = () => ({
  id: 'gnosis',
  symbol: 'xDai',
  platforms: {},
})

const makeThorchainMockCoingeckoResponse = () => ({
  id: 'thorchain',
  symbol: 'rune',
  platforms: {
    thorchain: '',
  },
})

vi.mock('fs', () => ({
  default: {
    promises: {
      writeFile: vi.fn(() => undefined),
      mkdir: vi.fn(() => undefined),
    },
  },
}))

describe('adapters:coingecko:utils', () => {
  describe('makeData', () => {
    it('can make btc data', () => {
      const result = bitcoinAssetMap
      const expected = { 'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin' }
      expect(result).toEqual(expected)
    })

    it('can make cosmos data', () => {
      const result = cosmosAssetMap
      const expected = { 'cosmos:cosmoshub-4/slip44:118': 'cosmos' }
      expect(result).toEqual(expected)
    })
  })

  describe('parseData', () => {
    it('can parse all data', () => {
      const result = parseData([
        makeEthMockCoingeckoResponse(),
        makeWethMockCoingeckoResponse(),
        makeFoxMockCoingeckoResponse(),
        makeBtcMockCoingeckoResponse(),
        makeCosmosMockCoingeckoResponse(),
        makeThorchainMockCoingeckoResponse(),
        makeAvalancheMockCoingeckoResponse(),
        makePolygonMockCoingeckoResponse(),
        makeGnosisMockCoingeckoResponse(),
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
        'cosmos:thorchain-1': {
          'cosmos:thorchain-1/slip44:931': 'thorchain',
        },
        'eip155:1': {
          'eip155:1/slip44:60': 'ethereum',
          'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth',
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'shapeshift-fox-token',
        },
        'eip155:43114': {
          'eip155:43114/slip44:60': 'avalanche-2',
          'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab': 'weth',
        },
        'eip155:56': {
          'eip155:56/slip44:60': 'binancecoin',
          'eip155:56/bep20:0x2170ed0880ac9a755fd29b2688956bd959f933f8': 'weth',
        },
        'eip155:10': {
          'eip155:10/slip44:60': 'ethereum',
          'eip155:10/erc20:0x4200000000000000000000000000000000000006': 'weth',
        },
        'eip155:137': {
          'eip155:137/slip44:60': 'matic-network',
          'eip155:137/erc20:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'weth',
        },
        'eip155:100': {
          'eip155:100/slip44:60': 'xdai',
          'eip155:100/erc20:0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1': 'weth',
        },
        'eip155:42161': {
          'eip155:42161/slip44:60': 'ethereum',
          'eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'weth',
        },
        'eip155:42170': {
          'eip155:42170/slip44:60': 'ethereum',
          'eip155:42170/erc20:0x722e8bdd2ce80a4422e880164f2079488e115365': 'weth',
        },
        'eip155:8453': {
          'eip155:8453/slip44:60': 'ethereum',
          'eip155:8453/erc20:0x4200000000000000000000000000000000000006': 'weth',
        },
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': 'solana',
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
      console.info = vi.fn()
      await writeFiles(data)
      expect(realFs.promises.mkdir).toHaveBeenNthCalledWith(
        1,
        './src/adapters/coingecko/generated/foo',
        { recursive: true },
      )
      expect(realFs.promises.writeFile).toHaveBeenNthCalledWith(
        1,
        './src/adapters/coingecko/generated/foo/adapter.json',
        fooAssetIds,
      )
      expect(realFs.promises.mkdir).toHaveBeenNthCalledWith(
        2,
        './src/adapters/coingecko/generated/bar',
        { recursive: true },
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
