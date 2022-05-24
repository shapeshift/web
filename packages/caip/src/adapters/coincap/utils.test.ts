import realFs from 'fs'

import { makeBtcData, makeCosmosHubData, makeOsmosisData } from '../../utils'
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
  explorer: 'https://etherscan.io/'
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
  explorer: 'https://etherscan.io/token/0xc770eefad204b5180df6a14ee197d99d808ee52d'
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
  explorer: 'https://blockchain.info/'
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
  explorer: 'https://www.mintscan.io/cosmos'
})

const makeOsmosisMockCoincapResponse = () => ({
  id: 'osmosis',
  rank: '730',
  symbol: 'OSMO',
  name: 'Osmosis',
  supply: '229862431.0000000000000000',
  maxSupply: '1000000000.0000000000000000',
  marketCapUsd: '1957320025.1314825668859843',
  volumeUsd24Hr: '15685.4558405572962647',
  priceUsd: '8.5151802172121053',
  changePercent24Hr: '0.5555705025303916',
  vwap24Hr: '8.7723272775832324',
  explorer: 'https://www.mintscan.io/osmosis'
})

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(async () => undefined)
  }
}))

describe('adapters:coincap:utils', () => {
  describe('parseEthData', () => {
    it('can parse eth data', async () => {
      const result = parseEthData([makeEthMockCoincapResponse(), makeFoxMockCoincapResponse()])
      const expected = {
        'eip155:1/slip44:60': 'ethereum',
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'fox-token'
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
      const expected = {
        'cosmos:osmosis-1/slip44:118': 'osmosis'
      }
      expect(result).toEqual(expected)
    })
  })

  describe('parseData', () => {
    it('can parse all data', async () => {
      const result = parseData([
        makeEthMockCoincapResponse(),
        makeFoxMockCoincapResponse(),
        makeBtcMockCoincapResponse(),
        makeCosmosMockCoincapResponse(),
        makeOsmosisMockCoincapResponse()
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
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': 'fox-token'
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
        './src/adapters/coincap/generated/foo/adapter.json',
        fooAssetIds
      )
      expect(realFs.promises.writeFile).toBeCalledWith(
        './src/adapters/coincap/generated/bar/adapter.json',
        barAssetIds
      )
      expect(console.info).toBeCalledWith('Generated CoinCap AssetId adapter data.')
    })
  })
})
