import { AssetNamespace } from './assetId/assetId'
import { ChainNamespace, ChainReference } from './chainId/chainId'

export const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
export const ethAssetId = 'eip155:1/slip44:60'
export const cosmosAssetId = 'cosmos:cosmoshub-4/slip44:118'
export const osmosisAssetId = 'cosmos:osmosis-1/slip44:118'

export const ethChainId = 'eip155:1'
export const btcChainId = 'bip122:000000000019d6689c085ae165831e93'
export const cosmosChainId = 'cosmos:cosmoshub-4'
export const osmosisChainId = 'cosmos:osmosis-1'

export const CHAIN_NAMESPACE = {
  Ethereum: 'eip155',
  Bitcoin: 'bip122',
  Cosmos: 'cosmos'
} as const

type ValidChainMap = {
  [k in ChainNamespace]: ChainReference[]
}

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

export const VALID_CHAIN_IDS: ValidChainMap = Object.freeze({
  [CHAIN_NAMESPACE.Bitcoin]: [CHAIN_REFERENCE.BitcoinMainnet, CHAIN_REFERENCE.BitcoinTestnet],
  [CHAIN_NAMESPACE.Ethereum]: [
    CHAIN_REFERENCE.EthereumMainnet,
    CHAIN_REFERENCE.EthereumRopsten,
    CHAIN_REFERENCE.EthereumRinkeby
  ],
  [CHAIN_NAMESPACE.Cosmos]: [
    CHAIN_REFERENCE.CosmosHubMainnet,
    CHAIN_REFERENCE.CosmosHubVega,
    CHAIN_REFERENCE.OsmosisMainnet,
    CHAIN_REFERENCE.OsmosisTestnet
  ]
})

type ValidAssetNamespace = {
  [k in ChainNamespace]: AssetNamespace[]
}

export const VALID_ASSET_NAMESPACE: ValidAssetNamespace = Object.freeze({
  [CHAIN_NAMESPACE.Bitcoin]: ['slip44'],
  [CHAIN_NAMESPACE.Ethereum]: ['slip44', 'erc20', 'erc721'],
  [CHAIN_NAMESPACE.Cosmos]: ['cw20', 'cw721', 'ibc', 'native', 'slip44']
})

export const ASSET_NAMESPACE_STRINGS = [
  'cw20',
  'cw721',
  'erc20',
  'erc721',
  'slip44',
  'native',
  'ibc'
] as const

export const ASSET_REFERENCE = {
  Bitcoin: '0',
  Ethereum: '60',
  Cosmos: '118',
  Osmosis: '118'
} as const
