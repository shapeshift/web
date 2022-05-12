import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { fromCAIP2, fromChainId, isChainId, toCAIP2, toChainId } from './chainId'

describe('chainId', () => {
  it('should have matching CAIP2 aliases', () => {
    expect(toChainId).toEqual(toCAIP2)
    expect(fromChainId).toEqual(fromCAIP2)
  })
  describe('toChainId', () => {
    it('can turn CosmosHub mainnet to ChainId', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const result = toChainId({ chain, network })
      expect(result).toEqual('cosmos:cosmoshub-4')
    })

    it('can turn CosmosHub testnet to ChainId', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_VEGA
      const result = toChainId({ chain, network })
      expect(result).toEqual('cosmos:vega-testnet')
    })

    it('can turn Osmosis mainnet to ChainId', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const result = toChainId({ chain, network })
      expect(result).toEqual('cosmos:osmosis-1')
    })

    it('can turn Osmosis testnet to ChainId', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_TESTNET
      const result = toChainId({ chain, network })
      expect(result).toEqual('cosmos:osmo-testnet-1')
    })

    it('can turn Ethereum mainnet to ChainId', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const result = toChainId({ chain, network })
      expect(result).toEqual('eip155:1')
    })

    it('can turn Ethereum testnet to ChainId', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.ETH_ROPSTEN
      const result = toChainId({ chain, network })
      expect(result).toEqual('eip155:3')
    })

    it('can turn Bitcoin mainnet to ChainId', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const result = toChainId({ chain, network })
      expect(result).toEqual('bip122:000000000019d6689c085ae165831e93')
    })

    it('can turn Bitcoin testnet to ChainId', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.TESTNET
      const result = toChainId({ chain, network })
      expect(result).toEqual('bip122:000000000933ea01ad0ee984209779ba')
    })

    it('should throw an error for an invalid chain', () => {
      // @ts-ignore
      expect(() => toChainId({ chain: ChainTypes.Osmosis, network: NetworkTypes.MAINNET })).toThrow(
        'unsupported'
      )
    })
  })

  describe('fromChainId', () => {
    it('can turn Bitcoin mainnet to chain and network', () => {
      const bitcoinChainId = 'bip122:000000000019d6689c085ae165831e93'
      const { chain, network } = fromChainId(bitcoinChainId)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.MAINNET)
    })

    it('can turn Bitcoin testnet to chain and network', () => {
      const bitcoinChainId = 'bip122:000000000933ea01ad0ee984209779ba'
      const { chain, network } = fromChainId(bitcoinChainId)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.TESTNET)
    })

    it('throws with invalid Bitcoin namespace ChainId', () => {
      const badBitcoinChainId = 'bip999:000000000933ea01ad0ee984209779ba'
      expect(() => fromChainId(badBitcoinChainId)).toThrow('fromChainId: unsupported chain: bip999')
    })

    it('throws with invalid Bitcoin reference ChainId', () => {
      const badBitcoinChainId = 'bip122:000000000xxxxxxxxxxxxxxxxxxxxxxx'
      expect(() => fromChainId(badBitcoinChainId)).toThrow(
        'fromChainId: unsupported bip122 network: 000000000xxxxxxxxxxxxxxxxxxxxxxx'
      )
    })

    it('can turn CosmosHub mainnet to chain and network', () => {
      const cosmosHubChainId = 'cosmos:cosmoshub-4'
      const { chain, network } = fromChainId(cosmosHubChainId)
      expect(chain).toEqual(ChainTypes.Cosmos)
      expect(network).toEqual(NetworkTypes.COSMOSHUB_MAINNET)
    })

    it('can turn CosmosHub testnet to chain and network', () => {
      const cosmosHubChainId = 'cosmos:vega-testnet'
      const { chain, network } = fromChainId(cosmosHubChainId)
      expect(chain).toEqual(ChainTypes.Cosmos)
      expect(network).toEqual(NetworkTypes.COSMOSHUB_VEGA)
    })

    it('throws with invalid Cosmos namespace ChainId', () => {
      const badCosmosChainId = 'cosmosssssssssss:cosmoshub-4'
      expect(() => fromChainId(badCosmosChainId)).toThrow(
        'fromChainId: unsupported chain: cosmosssssssssss'
      )
    })

    it('throws with invalid Cosmos reference ChainId', () => {
      const badCosmosChainId = 'cosmos:kek-testnet'
      expect(() => fromChainId(badCosmosChainId)).toThrow(
        'fromChainId: unsupported cosmos network: kek-testnet'
      )
    })

    it('can turn Osmosis mainnet to chain and network', () => {
      const osmosisChainId = 'cosmos:osmosis-1'
      const { chain, network } = fromChainId(osmosisChainId)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
    })

    it('can turn Osmosis testnet to chain and network', () => {
      const osmosisChainId = 'cosmos:osmo-testnet-1'
      const { chain, network } = fromChainId(osmosisChainId)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_TESTNET)
    })

    it('can turn Ethereum mainnet to chain and network', () => {
      const ethereumChainId = 'eip155:1'
      const { chain, network } = fromChainId(ethereumChainId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
    })

    it('throws with invalid Ethereum namespace ChainId', () => {
      const badEthereumChainId = 'eip123:1'
      expect(() => fromChainId(badEthereumChainId)).toThrow(
        'fromChainId: unsupported chain: eip123'
      )
    })

    it('throws with invalid Ethereum reference ChainId', () => {
      const badEthereumChainId = 'eip155:999'
      expect(() => fromChainId(badEthereumChainId)).toThrow(
        'fromChainId: unsupported eip155 network: 999'
      )
    })

    it('can turn Ethereum ropsten to chain and network', () => {
      const ethereumChainId = 'eip155:3'
      const { chain, network } = fromChainId(ethereumChainId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
    })

    it('can turn Ethereum rinkeby to chain and network', () => {
      const ethereumChainId = 'eip155:4'
      const { chain, network } = fromChainId(ethereumChainId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_RINKEBY)
    })

    it('should throw when there is no network reference', () => {
      expect(() => fromChainId('bip122')).toThrow('error parsing')
      expect(() => fromChainId(':1')).toThrow('error parsing')
      expect(() => fromChainId(':')).toThrow('error parsing')
    })
  })
})

describe('isChainId', () => {
  it('throws on eip155 without a network reference', () => {
    expect(() => isChainId('eip155')).toThrow()
  })

  it('validates eip155:1 mainnet as true', () => {
    expect(isChainId('eip155:1')).toBe(true)
  })

  it('throws on eip155:2 invalid network reference', () => {
    expect(() => isChainId('eip155:2')).toThrow()
  })

  it('validates ethereum testnets as true', () => {
    expect(isChainId('eip155:3')).toBe(true)
    expect(isChainId('eip155:4')).toBe(true)
  })

  it('validates bip122:000000000019d6689c085ae165831e93 mainnet as true', () => {
    expect(isChainId('bip122:000000000019d6689c085ae165831e93')).toBe(true)
  })

  it('validates bip122:000000000933ea01ad0ee984209779ba testnet as true', () => {
    expect(isChainId('bip122:000000000933ea01ad0ee984209779ba')).toBe(true)
  })

  it('throws on bip122 with the wrong network reference', () => {
    expect(() => isChainId('bip122:1')).toThrow()
  })

  it('throws on bip122', () => {
    // missing network
    expect(() => isChainId('bip122')).toThrow()
  })

  it('throws on empty string', () => {
    // missing network
    expect(() => isChainId('')).toThrow()
  })

  it('should return true for cosmos', () => {
    expect(isChainId('cosmos:cosmoshub-4')).toBe(true)
    expect(isChainId('cosmos:vega-testnet')).toBe(true)
  })

  it('should return true for osmosis', () => {
    expect(isChainId('cosmos:osmosis-1')).toBe(true)
    expect(isChainId('cosmos:osmo-testnet-1')).toBe(true)
  })

  it('should throw for an unknown cosmos chain', () => {
    expect(() => isChainId('cosmos:fakechain-1')).toThrow('invalid')
  })
})
