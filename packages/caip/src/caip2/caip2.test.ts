import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { fromCAIP2, isCAIP2, toCAIP2 } from './caip2'

describe('caip2', () => {
  describe('toCAIP2', () => {
    it('can turn eth mainnet to caip2', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('eip155:1')
    })

    it('can turn btc mainnet to caip2', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('bip122:000000000019d6689c085ae165831e93')
    })
  })

  describe('fromCAIP2', () => {
    it('can turn btc mainnet to chain and network', () => {
      const btcCaip2 = 'bip122:000000000019d6689c085ae165831e93'
      const { chain, network } = fromCAIP2(btcCaip2)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.MAINNET)
    })

    it('can turn btc testnet to chain and network', () => {
      const btcCaip2 = 'bip122:000000000933ea01ad0ee984209779ba'
      const { chain, network } = fromCAIP2(btcCaip2)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.TESTNET)
    })

    it('throws with invalid btc namespace caip', () => {
      const badBtcCaip2 = 'bip999:000000000933ea01ad0ee984209779ba'
      expect(() => fromCAIP2(badBtcCaip2)).toThrow('fromCAIP19: unsupported chain: bip999')
    })

    it('throws with invalid btc reference caip', () => {
      const badBtcCaip2 = 'bip122:000000000xxxxxxxxxxxxxxxxxxxxxxx'
      expect(() => fromCAIP2(badBtcCaip2)).toThrow(
        'fromCAIP19: unsupported bip122 network: 000000000xxxxxxxxxxxxxxxxxxxxxxx'
      )
    })

    it('can turn eth mainnet to chain and network', () => {
      const ethCaip2 = 'eip155:1'
      const { chain, network } = fromCAIP2(ethCaip2)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
    })

    it('throws with invalid eth namespace caip', () => {
      const badEthCaip2 = 'eip123:1'
      expect(() => fromCAIP2(badEthCaip2)).toThrow('fromCAIP19: unsupported chain: eip123')
    })

    it('throws with invalid eth reference caip', () => {
      const badEthCaip2 = 'eip155:999'
      expect(() => fromCAIP2(badEthCaip2)).toThrow('fromCAIP19: unsupported eip155 network: 999')
    })

    it('can turn eth ropsten to chain and network', () => {
      const ethCaip2 = 'eip155:3'
      const { chain, network } = fromCAIP2(ethCaip2)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
    })

    it('can turn eth rinkeby to chain and network', () => {
      const ethCaip2 = 'eip155:4'
      const { chain, network } = fromCAIP2(ethCaip2)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_RINKEBY)
    })
  })
})

describe('isCAIP2', () => {
  it('throws on eip155', () => {
    // missing network
    expect(() => isCAIP2('eip155')).toThrow()
  })

  it('validates eip155:1 as true', () => {
    // mainnet
    expect(isCAIP2('eip155:1')).toBeTruthy()
  })

  it('throws on eip155:2', () => {
    // doesn't exist
    expect(() => isCAIP2('eip155:2')).toThrow()
  })

  it('validates eip155:3 as true', () => {
    // ropsten
    expect(isCAIP2('eip155:3')).toBeTruthy()
  })

  it('validates eip155:4 as true', () => {
    // rinkeby
    expect(isCAIP2('eip155:4')).toBeTruthy()
  })

  it('validates bip122:000000000019d6689c085ae165831e93 as true', () => {
    // mainnet
    expect(isCAIP2('bip122:000000000019d6689c085ae165831e93')).toBeTruthy()
  })

  it('validates bip122:000000000933ea01ad0ee984209779ba as true', () => {
    // testnet
    expect(isCAIP2('bip122:000000000933ea01ad0ee984209779ba')).toBeTruthy()
  })

  it('throws on bip122:1', () => {
    // wrong network
    expect(() => isCAIP2('bip122:1')).toThrow()
  })

  it('throws on bip122', () => {
    // missing network
    expect(() => isCAIP2('bip122')).toThrow()
  })

  it('throws on empty string', () => {
    // missing network
    expect(() => isCAIP2('')).toThrow()
  })
})
