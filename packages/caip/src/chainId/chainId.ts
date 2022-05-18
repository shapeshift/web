// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md

import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import invert from 'lodash/invert'

export type ChainId = string

export const CHAIN_NAMESPACE = {
  Ethereum: 'eip155',
  Bitcoin: 'bip122',
  Cosmos: 'cosmos'
} as const

export type ChainNamespace = typeof CHAIN_NAMESPACE[keyof typeof CHAIN_NAMESPACE]

export const CHAIN_REFERENCE = {
  EthereumMainnet: '1',
  EthereumRopsten: '3',
  EthereumRinkeby: '4',
  // EthereumKovan: '42', // currently unsupported by ShapeShift
  // https://github.com/bitcoin/bips/blob/master/bip-0122.mediawiki#definition-of-chain-id
  // chainId uses max length of 32 chars of the genesis block
  BitcoinMainnet: '000000000019d6689c085ae165831e93',
  BitcoinTestnet: '000000000933ea01ad0ee984209779ba',
  CosmosHubMainnet: 'cosmoshub-4',
  CosmosHubVega: 'vega-testnet',
  OsmosisMainnet: 'osmosis-1',
  OsmosisTestnet: 'osmo-testnet-1'
} as const

export type ChainReference = typeof CHAIN_REFERENCE[keyof typeof CHAIN_REFERENCE]

type ToChainIdArgs = {
  chain: ChainTypes
  network: NetworkTypes | ChainReference
}

const shapeShiftToChainId = Object.freeze({
  [ChainTypes.Ethereum]: {
    namespace: CHAIN_NAMESPACE.Ethereum,
    reference: {
      [NetworkTypes.MAINNET]: CHAIN_REFERENCE.EthereumMainnet,
      [NetworkTypes.ETH_ROPSTEN]: CHAIN_REFERENCE.EthereumRopsten,
      [NetworkTypes.ETH_RINKEBY]: CHAIN_REFERENCE.EthereumRinkeby
    }
  },
  [ChainTypes.Bitcoin]: {
    namespace: CHAIN_NAMESPACE.Bitcoin,
    reference: {
      [NetworkTypes.MAINNET]: CHAIN_REFERENCE.BitcoinMainnet,
      [NetworkTypes.TESTNET]: CHAIN_REFERENCE.BitcoinTestnet
    }
  },
  [ChainTypes.Cosmos]: {
    namespace: CHAIN_NAMESPACE.Cosmos,
    reference: {
      [NetworkTypes.COSMOSHUB_MAINNET]: CHAIN_REFERENCE.CosmosHubMainnet,
      [NetworkTypes.COSMOSHUB_VEGA]: CHAIN_REFERENCE.CosmosHubVega
    }
  },
  [ChainTypes.Osmosis]: {
    namespace: CHAIN_NAMESPACE.Cosmos,
    reference: {
      [NetworkTypes.OSMOSIS_MAINNET]: CHAIN_REFERENCE.OsmosisMainnet,
      [NetworkTypes.OSMOSIS_TESTNET]: CHAIN_REFERENCE.OsmosisTestnet
    }
  }
})

export const toChainId = (args: ToChainIdArgs): string => {
  const { chain, network } = args
  const namespace: ChainNamespace = shapeShiftToChainId[chain].namespace

  switch (chain) {
    case ChainTypes.Ethereum: {
      const referenceMap = shapeShiftToChainId[chain].reference
      switch (network) {
        case NetworkTypes.MAINNET:
        case NetworkTypes.ETH_ROPSTEN:
        case NetworkTypes.ETH_RINKEBY: {
          const reference: ChainReference = referenceMap[network]
          return `${namespace}:${reference}`
        }
      }
      break
    }
    case ChainTypes.Bitcoin: {
      const referenceMap = shapeShiftToChainId[chain].reference
      switch (network) {
        case NetworkTypes.MAINNET:
        case NetworkTypes.TESTNET: {
          const reference: ChainReference = referenceMap[network]
          return `${namespace}:${reference}`
        }
      }
      break
    }
    case ChainTypes.Cosmos: {
      const referenceMap = shapeShiftToChainId[chain].reference
      switch (network) {
        case NetworkTypes.COSMOSHUB_MAINNET:
        case NetworkTypes.COSMOSHUB_VEGA: {
          const reference: ChainReference = referenceMap[network]
          return `${namespace}:${reference}`
        }
      }
      break
    }
    case ChainTypes.Osmosis: {
      const referenceMap = shapeShiftToChainId[chain].reference
      switch (network) {
        case NetworkTypes.OSMOSIS_MAINNET:
        case NetworkTypes.OSMOSIS_TESTNET: {
          const reference: ChainReference = referenceMap[network]
          return `${namespace}:${reference}`
        }
      }
      break
    }
  }

  throw new Error(`toChainId: unsupported ${chain} network: ${network}`)
}

type FromChainIdReturn = {
  chain: ChainTypes
  network: NetworkTypes
}

type FromChainId = (chainId: string) => FromChainIdReturn

export const fromChainId: FromChainId = (chainId) => {
  const [c, n] = chainId.split(':')
  if (!(c && n)) {
    throw new Error(`fromChainId: error parsing chainId, chain: ${c}, network: ${n}`)
  }
  switch (c) {
    case CHAIN_NAMESPACE.Cosmos: {
      switch (n) {
        case CHAIN_REFERENCE.CosmosHubMainnet: {
          return { chain: ChainTypes.Cosmos, network: NetworkTypes.COSMOSHUB_MAINNET }
        }
        case CHAIN_REFERENCE.CosmosHubVega: {
          return { chain: ChainTypes.Cosmos, network: NetworkTypes.COSMOSHUB_VEGA }
        }
        case CHAIN_REFERENCE.OsmosisMainnet: {
          return { chain: ChainTypes.Osmosis, network: NetworkTypes.OSMOSIS_MAINNET }
        }
        case CHAIN_REFERENCE.OsmosisTestnet: {
          return { chain: ChainTypes.Osmosis, network: NetworkTypes.OSMOSIS_TESTNET }
        }
        default: {
          throw new Error(`fromChainId: unsupported ${c} network: ${n}`)
        }
      }
    }

    case CHAIN_NAMESPACE.Ethereum: {
      const chain = ChainTypes.Ethereum
      switch (n) {
        case CHAIN_REFERENCE.EthereumMainnet: {
          const network = NetworkTypes.MAINNET
          return { chain, network }
        }
        case CHAIN_REFERENCE.EthereumRopsten: {
          const network = NetworkTypes.ETH_ROPSTEN
          return { chain, network }
        }
        case CHAIN_REFERENCE.EthereumRinkeby: {
          const network = NetworkTypes.ETH_RINKEBY
          return { chain, network }
        }
        default: {
          throw new Error(`fromChainId: unsupported ${c} network: ${n}`)
        }
      }
    }
    case CHAIN_NAMESPACE.Bitcoin: {
      const chain = ChainTypes.Bitcoin
      switch (n) {
        case CHAIN_REFERENCE.BitcoinMainnet: {
          const network = NetworkTypes.MAINNET
          return { chain, network }
        }
        case CHAIN_REFERENCE.BitcoinTestnet: {
          const network = NetworkTypes.TESTNET
          return { chain, network }
        }
        default: {
          throw new Error(`fromChainId: unsupported ${c} network: ${n}`)
        }
      }
    }
  }

  throw new Error(`fromChainId: unsupported chain: ${c}`)
}

type IsChainId = (chainId: string) => boolean

export const isChainId: IsChainId = (chainId) => {
  const [c, n] = chainId.split(':')
  if (!(c && n)) {
    throw new Error(`isChainId: error parsing chainId, chain: ${c}, network: ${n}`)
  }

  switch (c) {
    case CHAIN_NAMESPACE.Cosmos: {
      switch (n) {
        case CHAIN_REFERENCE.CosmosHubMainnet:
        case CHAIN_REFERENCE.CosmosHubVega:
        case CHAIN_REFERENCE.OsmosisMainnet:
        case CHAIN_REFERENCE.OsmosisTestnet:
          return true
      }
      break
    }

    case CHAIN_NAMESPACE.Ethereum: {
      switch (n) {
        case CHAIN_REFERENCE.EthereumMainnet:
        case CHAIN_REFERENCE.EthereumRopsten:
        case CHAIN_REFERENCE.EthereumRinkeby:
          return true
      }
      break
    }
    case CHAIN_NAMESPACE.Bitcoin: {
      switch (n) {
        case CHAIN_REFERENCE.BitcoinMainnet:
        case CHAIN_REFERENCE.BitcoinTestnet:
          return true
      }
      break
    }
  }

  throw new Error(`isChainId: invalid ChainId ${chainId}`)
}

export const chainReferenceToNetworkType: Record<ChainReference, NetworkTypes> = Object.freeze({
  [CHAIN_REFERENCE.BitcoinMainnet]: NetworkTypes.MAINNET,
  [CHAIN_REFERENCE.BitcoinTestnet]: NetworkTypes.TESTNET,
  [CHAIN_REFERENCE.EthereumMainnet]: NetworkTypes.MAINNET,
  [CHAIN_REFERENCE.EthereumRopsten]: NetworkTypes.ETH_ROPSTEN,
  [CHAIN_REFERENCE.EthereumRinkeby]: NetworkTypes.ETH_RINKEBY,
  [CHAIN_REFERENCE.CosmosHubMainnet]: NetworkTypes.COSMOSHUB_MAINNET,
  [CHAIN_REFERENCE.CosmosHubVega]: NetworkTypes.COSMOSHUB_VEGA,
  [CHAIN_REFERENCE.OsmosisMainnet]: NetworkTypes.OSMOSIS_MAINNET,
  [CHAIN_REFERENCE.OsmosisTestnet]: NetworkTypes.OSMOSIS_TESTNET
})

export const networkTypeToChainReference = invert(chainReferenceToNetworkType) as Record<
  NetworkTypes,
  ChainReference
>

export const chainNamespaceToChainType: Record<ChainNamespace, ChainTypes> = Object.freeze({
  [CHAIN_NAMESPACE.Bitcoin]: ChainTypes.Bitcoin,
  [CHAIN_NAMESPACE.Ethereum]: ChainTypes.Ethereum,
  [CHAIN_NAMESPACE.Cosmos]: ChainTypes.Cosmos
})

export const toCAIP2 = toChainId
export const fromCAIP2 = fromChainId
