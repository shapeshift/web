import realFs from 'fs'

import { makeBtcData, parseData, parseEthData, writeFiles } from './utils'

const eth = {
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
}

const fox = {
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
}

const btc = {
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
}

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(async () => undefined)
  }
}))

describe('parseEthData', () => {
  it('can parse eth data', async () => {
    const result = parseEthData([eth, fox])
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
})

describe('parseData', () => {
  it('can parse all data', async () => {
    const result = parseData([eth, fox, btc])
    const expected = {
      'bip122:000000000019d6689c085ae165831e93': {
        'bip122:000000000019d6689c085ae165831e93/slip44:0': 'bitcoin'
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
        caip19abc: 'bitcorn',
        caip19def: 'efferium'
      },
      bar: {
        caip19ghi: 'fox',
        caip19jkl: 'shib'
      }
    }
    const fooCaips = JSON.stringify(data.foo)
    const barCaips = JSON.stringify(data.bar)
    console.info = jest.fn()
    await writeFiles(data)
    expect(realFs.promises.writeFile).toBeCalledWith(
      './src/adapters/coincap/generated/foo/adapter.json',
      fooCaips
    )
    expect(realFs.promises.writeFile).toBeCalledWith(
      './src/adapters/coincap/generated/bar/adapter.json',
      barCaips
    )
    expect(console.info).toBeCalledWith('Generated CoinCap CAIP19 adapter data.')
  })
})
