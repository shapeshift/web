import { AssetId, AssetNamespace } from './assetId/assetId'
import { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'

export const btcAssetId: AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
export const bchAssetId: AssetId = 'bip122:000000000000000000651ef99cb9fcbe/slip44:145'
export const dogeAssetId: AssetId = 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3'
export const ltcAssetId: AssetId = 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'

export const ethAssetId: AssetId = 'eip155:1/slip44:60'
export const avalancheAssetId: AssetId = 'eip155:43114/slip44:9000'

export const cosmosAssetId: AssetId = 'cosmos:cosmoshub-4/slip44:118'
export const osmosisAssetId: AssetId = 'cosmos:osmosis-1/slip44:118'

export const btcChainId: ChainId = 'bip122:000000000019d6689c085ae165831e93'
export const bchChainId: ChainId = 'bip122:000000000000000000651ef99cb9fcbe'
export const dogeChainId: ChainId = 'bip122:00000000001a91e3dace36e2be3bf030'
export const ltcChainId: ChainId = 'bip122:12a765e31ffd4059bada1e25190f6e98'

export const ethChainId: ChainId = 'eip155:1'
export const avalancheChainId: ChainId = 'eip155:43114'

export const cosmosChainId: ChainId = 'cosmos:cosmoshub-4'
export const osmosisChainId: ChainId = 'cosmos:osmosis-1'

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
  BitcoinCashMainnet: '000000000000000000651ef99cb9fcbe',
  DogecoinMainnet: '00000000001a91e3dace36e2be3bf030',
  LitecoinMainnet: '12a765e31ffd4059bada1e25190f6e98',
  CosmosHubMainnet: 'cosmoshub-4',
  CosmosHubVega: 'vega-testnet',
  OsmosisMainnet: 'osmosis-1',
  OsmosisTestnet: 'osmo-testnet-1',
  AvalancheCChain: '43114' // https://docs.avax.network/apis/avalanchego/apis/c-chain
} as const

export const VALID_CHAIN_IDS: ValidChainMap = Object.freeze({
  [CHAIN_NAMESPACE.Bitcoin]: [
    CHAIN_REFERENCE.BitcoinMainnet,
    CHAIN_REFERENCE.BitcoinTestnet,
    CHAIN_REFERENCE.BitcoinCashMainnet,
    CHAIN_REFERENCE.DogecoinMainnet,
    CHAIN_REFERENCE.LitecoinMainnet
  ],
  [CHAIN_NAMESPACE.Ethereum]: [
    CHAIN_REFERENCE.EthereumMainnet,
    CHAIN_REFERENCE.EthereumRopsten,
    CHAIN_REFERENCE.EthereumRinkeby,
    CHAIN_REFERENCE.AvalancheCChain
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
  Litecoin: '2',
  Dogecoin: '3',
  Ethereum: '60',
  Cosmos: '118',
  Osmosis: '118',
  Bitcoincash: '145',
  AvalancheC: '9000'
} as const
