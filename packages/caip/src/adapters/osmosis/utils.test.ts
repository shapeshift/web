import realFs from 'fs'

import { parseData, parseOsmosisData, writeFiles } from './utils'

const makeMockOsmosisIbcResponse = () => ({
  price: 24.0584236229,
  denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
  symbol: 'ATOM',
  liquidity: 280276929.9793994,
  liquidity_24h_change: -6.3695921008,
  volume_24h: 33922555.29363544,
  volume_24h_change: 28440481.922440086,
  name: 'Cosmos',
  price_24h_change: -6.5244109318
})

const makeMockOsmosisIonResponse = () => ({
  price: 7435.9686914631,
  denom: 'uion',
  symbol: 'ION',
  liquidity: 9029454.761384573,
  liquidity_24h_change: -7.1292267715,
  volume_24h: 105336.6508543715,
  volume_24h_change: 162210.3355220161,
  name: 'Ion',
  price_24h_change: -7.3562029115
})

const makeMockOsmosisNativeResponse = () => ({
  price: 8.0392746321,
  denom: 'uosmo',
  symbol: 'OSMO',
  liquidity: 498213321.1457288,
  liquidity_24h_change: -5.2720710364,
  volume_24h: 88323103.19323264,
  volume_24h_change: 70196881.25419419,
  name: 'Osmosis',
  price_24h_change: -5.9792092329
})

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(async () => undefined)
  }
}))

describe('parseOsmosisData', () => {
  it('can parse osmosis data', async () => {
    const result = parseOsmosisData([
      makeMockOsmosisNativeResponse(),
      makeMockOsmosisIbcResponse(),
      makeMockOsmosisIonResponse()
    ])
    const expected = {
      'cosmos:osmosis-1/ibc:27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2':
        'ATOM',
      'cosmos:osmosis-1/native:uion': 'ION',
      'cosmos:osmosis-1/slip44:118': 'OSMO'
    }
    expect(result).toEqual(expected)
  })
})

describe('parseData', () => {
  it('can parse all data', async () => {
    const result = parseData([
      makeMockOsmosisIonResponse(),
      makeMockOsmosisIbcResponse(),
      makeMockOsmosisNativeResponse()
    ])
    const expected = {
      'cosmos:osmosis-1': {
        'cosmos:osmosis-1/ibc:27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2':
          'ATOM',
        'cosmos:osmosis-1/native:uion': 'ION',
        'cosmos:osmosis-1/slip44:118': 'OSMO'
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
      './src/adapters/osmosis/generated/foo/adapter.json',
      fooAssetIds
    )
    expect(realFs.promises.writeFile).toBeCalledWith(
      './src/adapters/osmosis/generated/bar/adapter.json',
      barAssetIds
    )
    expect(console.info).toBeCalledWith('Generated Osmosis AssetId adapter data.')
  })
})
