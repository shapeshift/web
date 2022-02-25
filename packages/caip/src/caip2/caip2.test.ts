import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { fromCAIP2, isCAIP2, toCAIP2 } from './caip2'

describe('caip2', () => {
  describe('toCAIP2', () => {
    it('can turn CosmosHub mainnet to caip2', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('cosmos:cosmoshub-4')
    })

    it('can turn CosmosHub testnet to caip2', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_VEGA
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('cosmos:vega-testnet')
    })

    it('can turn Osmosis mainnet to caip2', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('cosmos:osmosis-1')
    })

    it('can turn Osmosis testnet to caip2', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_TESTNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('cosmos:osmo-testnet-1')
    })

    it('can turn Ethereum mainnet to caip2', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('eip155:1')
    })

    it('can turn Ethereum testnet to caip2', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.ETH_ROPSTEN
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('eip155:3')
    })

    it('can turn Bitcoin mainnet to caip2', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('bip122:000000000019d6689c085ae165831e93')
    })

    it('can turn Bitcoin testnet to caip2', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.TESTNET
      const result = toCAIP2({ chain, network })
      expect(result).toEqual('bip122:000000000933ea01ad0ee984209779ba')
    })

    it('should throw an error for an invalid chain', () => {
      // @ts-ignore
      expect(() => toCAIP2({ chain: ChainTypes.Osmosis, network: NetworkTypes.MAINNET })).toThrow(
        'unsupported'
      )
    })
  })

  describe('fromCAIP2', () => {
    it('can turn Bitcoin mainnet to chain and network', () => {
      const bitcoinCaip2 = 'bip122:000000000019d6689c085ae165831e93'
      const { chain, network } = fromCAIP2(bitcoinCaip2)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.MAINNET)
    })

    it('can turn Bitcoin testnet to chain and network', () => {
      const bitcoinCaip2 = 'bip122:000000000933ea01ad0ee984209779ba'
      const { chain, network } = fromCAIP2(bitcoinCaip2)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.TESTNET)
    })

    it('throws with invalid Bitcoin namespace caip', () => {
      const badBitcoinCaip2 = 'bip999:000000000933ea01ad0ee984209779ba'
      expect(() => fromCAIP2(badBitcoinCaip2)).toThrow('fromCAIP19: unsupported chain: bip999')
    })

    it('throws with invalid Bitcoin reference caip', () => {
      const badBitcoinCaip2 = 'bip122:000000000xxxxxxxxxxxxxxxxxxxxxxx'
      expect(() => fromCAIP2(badBitcoinCaip2)).toThrow(
        'fromCAIP19: unsupported bip122 network: 000000000xxxxxxxxxxxxxxxxxxxxxxx'
      )
    })

    it('can turn CosmosHub mainnet to chain and network', () => {
      const cosmosHubCaip2 = 'cosmos:cosmoshub-4'
      const { chain, network } = fromCAIP2(cosmosHubCaip2)
      expect(chain).toEqual(ChainTypes.Cosmos)
      expect(network).toEqual(NetworkTypes.COSMOSHUB_MAINNET)
    })

    it('can turn CosmosHub testnet to chain and network', () => {
      const cosmosHubCaip2 = 'cosmos:vega-testnet'
      const { chain, network } = fromCAIP2(cosmosHubCaip2)
      expect(chain).toEqual(ChainTypes.Cosmos)
      expect(network).toEqual(NetworkTypes.COSMOSHUB_VEGA)
    })

    it('throws with invalid Cosmos namespace caip', () => {
      const badCosmosCaip2 = 'cosmosssssssssss:cosmoshub-4'
      expect(() => fromCAIP2(badCosmosCaip2)).toThrow(
        'fromCAIP19: unsupported chain: cosmosssssssssss'
      )
    })

    it('throws with invalid Cosmos reference caip', () => {
      const badCosmosCaip2 = 'cosmos:kek-testnet'
      expect(() => fromCAIP2(badCosmosCaip2)).toThrow(
        'fromCAIP19: unsupported cosmos network: kek-testnet'
      )
    })

    it('can turn Osmosis mainnet to chain and network', () => {
      const osmosisCaip2 = 'cosmos:osmosis-1'
      const { chain, network } = fromCAIP2(osmosisCaip2)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
    })

    it('can turn Osmosis testnet to chain and network', () => {
      const osmosisCaip2 = 'cosmos:osmo-testnet-1'
      const { chain, network } = fromCAIP2(osmosisCaip2)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_TESTNET)
    })

    it('can turn Ethereum mainnet to chain and network', () => {
      const ethereumCaip2 = 'eip155:1'
      const { chain, network } = fromCAIP2(ethereumCaip2)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
    })

    it('throws with invalid Ethereum namespace caip', () => {
      const badEthereumCaip2 = 'eip123:1'
      expect(() => fromCAIP2(badEthereumCaip2)).toThrow('fromCAIP19: unsupported chain: eip123')
    })

    it('throws with invalid Ethereum reference caip', () => {
      const badEthereumCaip2 = 'eip155:999'
      expect(() => fromCAIP2(badEthereumCaip2)).toThrow(
        'fromCAIP19: unsupported eip155 network: 999'
      )
    })

    it('can turn Ethereum ropsten to chain and network', () => {
      const ethereumCaip2 = 'eip155:3'
      const { chain, network } = fromCAIP2(ethereumCaip2)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
    })

    it('can turn Ethereum rinkeby to chain and network', () => {
      const ethereumCaip2 = 'eip155:4'
      const { chain, network } = fromCAIP2(ethereumCaip2)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_RINKEBY)
    })

    it('should throw when there is no network reference', () => {
      expect(() => fromCAIP2('bip122')).toThrow('error parsing')
      expect(() => fromCAIP2(':1')).toThrow('error parsing')
      expect(() => fromCAIP2(':')).toThrow('error parsing')
    })
  })
})

describe('isCAIP2', () => {
  it('throws on eip155 without a network reference', () => {
    expect(() => isCAIP2('eip155')).toThrow()
  })

  it('validates eip155:1 mainnet as true', () => {
    expect(isCAIP2('eip155:1')).toBe(true)
  })

  it('throws on eip155:2 invalid network reference', () => {
    expect(() => isCAIP2('eip155:2')).toThrow()
  })

  it('validates ethereum testnets as true', () => {
    expect(isCAIP2('eip155:3')).toBe(true)
    expect(isCAIP2('eip155:4')).toBe(true)
  })

  it('validates bip122:000000000019d6689c085ae165831e93 mainnet as true', () => {
    expect(isCAIP2('bip122:000000000019d6689c085ae165831e93')).toBe(true)
  })

  it('validates bip122:000000000933ea01ad0ee984209779ba testnet as true', () => {
    expect(isCAIP2('bip122:000000000933ea01ad0ee984209779ba')).toBe(true)
  })

  it('throws on bip122 with the wrong network reference', () => {
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

  it('should return true for cosmos', () => {
    expect(isCAIP2('cosmos:cosmoshub-4')).toBe(true)
    expect(isCAIP2('cosmos:vega-testnet')).toBe(true)
  })

  it('should return true for osmosis', () => {
    expect(isCAIP2('cosmos:osmosis-1')).toBe(true)
    expect(isCAIP2('cosmos:osmo-testnet-1')).toBe(true)
  })

  it('should throw for an unknown cosmos chain', () => {
    expect(() => isCAIP2('cosmos:fakechain-1')).toThrow('invalid')
  })
})
