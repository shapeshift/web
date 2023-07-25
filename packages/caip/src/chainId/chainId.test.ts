import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../constants'
import { assertIsChainId, isChainId } from '../typeGuards'
import { fromCAIP2, fromChainId, toCAIP2, toChainId } from './chainId'

describe('chainId', () => {
  it('should have matching CAIP2 aliases', () => {
    expect(toChainId).toEqual(toCAIP2)
    expect(fromChainId).toEqual(fromCAIP2)
  })
  describe('toChainId', () => {
    it('can turn CosmosHub mainnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('cosmos:cosmoshub-4')
    })

    it('can turn CosmosHub testnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.CosmosHubVega
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('cosmos:vega-testnet')
    })

    it('can turn Osmosis mainnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('cosmos:osmosis-1')
    })

    it('can turn Osmosis testnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.OsmosisTestnet
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('cosmos:osmo-testnet-1')
    })

    it('can turn Ethereum mainnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('eip155:1')
    })

    it('can turn Ethereum testnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumRopsten
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('eip155:3')
    })

    it('can turn Bitcoin mainnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Utxo
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('bip122:000000000019d6689c085ae165831e93')
    })

    it('can turn Bitcoin testnet to ChainId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Utxo
      const chainReference = CHAIN_REFERENCE.BitcoinTestnet
      const result = toChainId({ chainNamespace, chainReference })
      expect(result).toEqual('bip122:000000000933ea01ad0ee984209779ba')
    })

    it('should throw an error for an invalid chain', () => {
      // @ts-ignore
      expect(() =>
        toChainId({
          chainNamespace: CHAIN_NAMESPACE.Utxo,
          chainReference: CHAIN_REFERENCE.CosmosHubVega,
        }),
      ).toThrow('assertIsChainId: unsupported ChainId: bip122:vega-testnet')
    })
  })

  describe('fromChainId', () => {
    it('can turn Bitcoin mainnet to chain and network', () => {
      const bitcoinChainId = 'bip122:000000000019d6689c085ae165831e93'
      const { chainNamespace, chainReference } = fromChainId(bitcoinChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Utxo)
      expect(chainReference).toEqual(CHAIN_REFERENCE.BitcoinMainnet)
    })

    it('can turn Bitcoin testnet to chain and network', () => {
      const bitcoinChainId = 'bip122:000000000933ea01ad0ee984209779ba'
      const { chainNamespace, chainReference } = fromChainId(bitcoinChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Utxo)
      expect(chainReference).toEqual(CHAIN_REFERENCE.BitcoinTestnet)
    })

    it('can turn CosmosHub mainnet to chain and network', () => {
      const cosmosHubChainId = 'cosmos:cosmoshub-4'
      const { chainNamespace, chainReference } = fromChainId(cosmosHubChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.CosmosSdk)
      expect(chainReference).toEqual(CHAIN_REFERENCE.CosmosHubMainnet)
    })

    it('can turn CosmosHub testnet to chain and network', () => {
      const cosmosHubChainId = 'cosmos:vega-testnet'
      const { chainNamespace, chainReference } = fromChainId(cosmosHubChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.CosmosSdk)
      expect(chainReference).toEqual(CHAIN_REFERENCE.CosmosHubVega)
    })

    it('can turn Osmosis mainnet to chain and network', () => {
      const osmosisChainId = 'cosmos:osmosis-1'
      const { chainNamespace, chainReference } = fromChainId(osmosisChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.CosmosSdk)
      expect(chainReference).toEqual(CHAIN_REFERENCE.OsmosisMainnet)
    })

    it('can turn Osmosis testnet to chain and network', () => {
      const osmosisChainId = 'cosmos:osmo-testnet-1'
      const { chainNamespace, chainReference } = fromChainId(osmosisChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.CosmosSdk)
      expect(chainReference).toEqual(CHAIN_REFERENCE.OsmosisTestnet)
    })

    it('can turn Ethereum mainnet to chain and network', () => {
      const ethereumChainId = 'eip155:1'
      const { chainNamespace, chainReference } = fromChainId(ethereumChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Evm)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumMainnet)
    })

    it('can turn Ethereum ropsten to chain and network', () => {
      const ethereumChainId = 'eip155:3'
      const { chainNamespace, chainReference } = fromChainId(ethereumChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Evm)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumRopsten)
    })

    it('can turn Ethereum rinkeby to chain and network', () => {
      const ethereumChainId = 'eip155:4'
      const { chainNamespace, chainReference } = fromChainId(ethereumChainId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Evm)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumRinkeby)
    })
  })
})

describe('isChainId', () => {
  it('throws on eip155 without a network reference', () => {
    expect(() => assertIsChainId('eip155')).toThrow()
  })

  it('validates eip155:1 mainnet as true', () => {
    expect(isChainId('eip155:1')).toBe(true)
  })

  it('throws on eip155:2 unsupported network reference', () => {
    expect(() => assertIsChainId('eip155:2')).toThrow()
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
    expect(() => assertIsChainId('bip122:1')).toThrow()
  })

  it('throws on bip122', () => {
    // missing network
    expect(() => assertIsChainId('bip122')).toThrow()
  })

  it('throws on empty string', () => {
    // missing network
    expect(() => assertIsChainId('')).toThrow()
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
    expect(() => assertIsChainId('cosmos:fakechain-1')).toThrow(
      'assertIsChainId: unsupported ChainId: cosmos:fakechain-1',
    )
  })
})
