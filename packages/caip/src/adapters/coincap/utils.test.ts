/**
 * @vitest-environment node
 */

import realFs from 'fs'
import { describe, expect, it, vi } from 'vitest'

import { bitcoinAssetMap, cosmosAssetMap } from '../../utils'
import { parseData, parseEthData, writeFiles } from './utils'

const makeEthMockCoincapResponse = () => ({
  id: 'ethereum',
  rank: '2',
  symbol: 'ETH',
  name: 'Ethereum',
  supply: '118739782.1240000000000000',
  maxSupply: null,
  marketCapUsd: '461557096820.5397856216327206',
  volumeUsd24Hr: '13216473429.9114945699035335',
  priceUsd: '3887.1310740534754598',
  changePercent24Hr: '1.7301970732523704',
  vwap24Hr: '3796.0013297212388563',
  explorer: 'https://etherscan.io/',
})

const makeFoxMockCoincapResponse = () => ({
  id: 'fox-token',
  rank: '396',
  symbol: 'FOX',
  name: 'FOX Token',
  supply: '117022448.6044180000000000',
  maxSupply: '1000001337.0000000000000000',
  marketCapUsd: '76108238.1995641297877127',
  volumeUsd24Hr: '1574012.7599955363585018',
  priceUsd: '0.6503729763580659',
  changePercent24Hr: '-3.1066427856364231',
  vwap24Hr: '0.6546275575306273',
  explorer: 'https://etherscan.io/token/0xc770eefad204b5180df6a14ee197d99d808ee52d',
})

const makeBtcMockCoincapResponse = () => ({
  id: 'bitcoin',
  rank: '1',
  symbol: 'BTC',
  name: 'Bitcoin',
  supply: '18901193.0000000000000000',
  maxSupply: '21000000.0000000000000000',
  marketCapUsd: '908356345541.2269154394485668',
  volumeUsd24Hr: '19001957914.4173604708767279',
  priceUsd: '48058.1487920485715076',
  changePercent24Hr: '2.0370678507913180',
  vwap24Hr: '47473.8260811456834087',
  explorer: 'https://blockchain.info/',
})

const makeThorchainMockCoincapResponse = () => ({
  id: 'thorchain',
  rank: '65',
  symbol: 'RUNE',
  name: 'THORChain',
  supply: '330688061.3344559700000000',
  maxSupply: '500000000.0000000000000000',
  marketCapUsd: '657476102.4209547026470565',
  volumeUsd24Hr: '62707742.6988409953177376',
  priceUsd: '1.9882063469959601',
  changePercent24Hr: '-3.0298851309669810',
  vwap24Hr: '2.0280215210735477',
  explorer: 'https://explorer.binance.org/asset/RUNE-B1A',
})

const makeCosmosMockCoincapResponse = () => ({
  id: 'cosmos',
  rank: '24',
  symbol: 'ATOM',
  name: 'Cosmos',
  supply: '248453201.0000000000000000',
  maxSupply: null,
  marketCapUsd: '6802617738.3591834303735576',
  volumeUsd24Hr: '294469112.0045679597220454',
  priceUsd: '27.3798756102932376',
  changePercent24Hr: '-2.0945235735481851',
  vwap24Hr: '27.4571410501515669',
  explorer: 'https://www.mintscan.io/cosmos',
})

vi.mock('fs', () => ({
  default: {
    promises: {
      writeFile: vi.fn(() => undefined),
    },
  },
}))

describe('adapters:coincap:utils', () => {
  describe('parseEthData', () => {
    it('can parse eth data', () => {
      const result = parseEthData([makeEthMockCoincapResponse(), makeFoxMockCoincapResponse()])
      const expected = {
        'eip155:1/slip44:60': 'ethereum',
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'fox-token',
      }
      expect(result).toEqual(expected)
    })

    it('can parse btc data', () => {
      const result = bitcoinAssetMap
      const expected = { 'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin' }
      expect(result).toEqual(expected)
    })

    it('can parse cosmos data', () => {
      const result = cosmosAssetMap
      const expected = { 'cosmos:cosmoshub-4/slip44:118': 'cosmos' }
      expect(result).toEqual(expected)
    })
  })

  describe('parseData', () => {
    it('can parse all data', () => {
      const result = parseData([
        makeEthMockCoincapResponse(),
        makeFoxMockCoincapResponse(),
        makeBtcMockCoincapResponse(),
        makeCosmosMockCoincapResponse(),
        makeThorchainMockCoincapResponse(),
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
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'fox-token',
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
      expect(realFs.promises.writeFile).toBeCalledWith(
        './src/adapters/coincap/generated/foo/adapter.json',
        fooAssetIds,
      )
      expect(realFs.promises.writeFile).toBeCalledWith(
        './src/adapters/coincap/generated/bar/adapter.json',
        barAssetIds,
      )
      expect(console.info).toBeCalledWith('Generated CoinCap AssetId adapter data.')
    })
  })
})
