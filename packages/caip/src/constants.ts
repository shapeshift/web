import { AssetId, AssetNamespace } from './assetId/assetId'
import { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'

export const btcAssetId: AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
export const bchAssetId: AssetId = 'bip122:000000000000000000651ef99cb9fcbe/slip44:145'
export const dogeAssetId: AssetId = 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3'
export const ltcAssetId: AssetId = 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'

export const ethAssetId: AssetId = 'eip155:1/slip44:60'
export const avalancheAssetId: AssetId = 'eip155:43114/slip44:9000'
export const foxAssetId: AssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const foxyAssetId: AssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'

export const cosmosAssetId: AssetId = 'cosmos:cosmoshub-4/slip44:118'
export const osmosisAssetId: AssetId = 'cosmos:osmosis-1/slip44:118'
export const thorchainAssetId: AssetId = 'cosmos:thorchain-mainnet-v1/slip44:931'
export const binanceAssetId: AssetId = 'cosmos:binance-chain-tigris/slip44:714'
export const kavaAssetId: AssetId = 'cosmos:kava_2222-10/slip44:459'
export const terraAssetId: AssetId = 'cosmos:phoenix-1/slip44:330'
export const secretAssetId: AssetId = 'cosmos:secret-4/slip44:529'

export const btcChainId: ChainId = 'bip122:000000000019d6689c085ae165831e93'
export const bchChainId: ChainId = 'bip122:000000000000000000651ef99cb9fcbe'
export const dogeChainId: ChainId = 'bip122:00000000001a91e3dace36e2be3bf030'
export const ltcChainId: ChainId = 'bip122:12a765e31ffd4059bada1e25190f6e98'

export const ethChainId: ChainId = 'eip155:1'
export const avalancheChainId: ChainId = 'eip155:43114'

export const cosmosChainId: ChainId = 'cosmos:cosmoshub-4'
export const osmosisChainId: ChainId = 'cosmos:osmosis-1'
export const thorchainChainId: ChainId = 'cosmos:thorchain-mainnet-v1'
export const binanceChainId: ChainId = 'cosmos:binance-chain-tigris'
export const kavaChainId: ChainId = 'cosmos:kava_2222-10'
export const terraChainId: ChainId = 'cosmos:phoenix-1'
export const secretChainId: ChainId = 'cosmos:secret-4'

export const CHAIN_NAMESPACE = {
  Evm: 'eip155',
  Utxo: 'bip122',
  CosmosSdk: 'cosmos',
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
  ThorchainMainnet: 'thorchain-mainnet-v1',
  AvalancheCChain: '43114', // https://docs.avax.network/apis/avalanchego/apis/c-chain
  BinanceMainnet: 'binance-chain-tigris', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  BinanceTestnet: 'binance-chain-ganges', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  KavaMainnet: 'kava_2222-10', // https://github.com/Kava-Labs/rosetta-kava/blob/1c04619078a8d3293e296c66eb322c505589f2d6/services/construction_payloads.go#L115
  KavaTestnet: 'kava_2221-16000', // https://github.com/Kava-Labs/rosetta-kava/blob/1c04619078a8d3293e296c66eb322c505589f2d6/services/construction_payloads.go#L117
  TerraMainnet: 'phoenix-1', // https://docs.terra.money/full-node/run-a-full-terra-node/join-a-network/
  TerraTestnet: 'pisco-1', // https://docs.terra.money/full-node/run-a-full-terra-node/join-a-network/
  SecretMainnet: 'secret-4', // https://docs.scrt.network/secret-network-documentation/development/api-endpoints
  SecretTestnet: 'pulsar-2', // https://docs.scrt.network/secret-network-documentation/development/api-endpoints
} as const

export const ASSET_NAMESPACE = {
  cw20: 'cw20',
  cw721: 'cw721',
  erc20: 'erc20',
  erc721: 'erc721',
  slip44: 'slip44',
  native: 'native',
  ibc: 'ibc',
} as const

export const ASSET_REFERENCE = {
  Bitcoin: '0',
  Litecoin: '2',
  Dogecoin: '3',
  Ethereum: '60',
  Cosmos: '118',
  Osmosis: '118',
  Thorchain: '931',
  BitcoinCash: '145',
  AvalancheC: '9000',
  Binance: '714',
  Kava: '459',
  Terra: '330',
  Secret: '529',
} as const

export const VALID_CHAIN_IDS: ValidChainMap = Object.freeze({
  [CHAIN_NAMESPACE.Utxo]: [
    CHAIN_REFERENCE.BitcoinMainnet,
    CHAIN_REFERENCE.BitcoinTestnet,
    CHAIN_REFERENCE.BitcoinCashMainnet,
    CHAIN_REFERENCE.DogecoinMainnet,
    CHAIN_REFERENCE.LitecoinMainnet,
  ],
  [CHAIN_NAMESPACE.Evm]: [
    CHAIN_REFERENCE.EthereumMainnet,
    CHAIN_REFERENCE.EthereumRopsten,
    CHAIN_REFERENCE.EthereumRinkeby,
    CHAIN_REFERENCE.AvalancheCChain,
  ],
  [CHAIN_NAMESPACE.CosmosSdk]: [
    CHAIN_REFERENCE.CosmosHubMainnet,
    CHAIN_REFERENCE.CosmosHubVega,
    CHAIN_REFERENCE.OsmosisMainnet,
    CHAIN_REFERENCE.OsmosisTestnet,
    CHAIN_REFERENCE.ThorchainMainnet,
    CHAIN_REFERENCE.BinanceMainnet,
    CHAIN_REFERENCE.KavaMainnet,
    CHAIN_REFERENCE.TerraMainnet,
    CHAIN_REFERENCE.SecretMainnet,
  ],
})

type ValidAssetNamespace = {
  [k in ChainNamespace]: AssetNamespace[]
}

export const VALID_ASSET_NAMESPACE: ValidAssetNamespace = Object.freeze({
  [CHAIN_NAMESPACE.Utxo]: [ASSET_NAMESPACE.slip44],
  [CHAIN_NAMESPACE.Evm]: [ASSET_NAMESPACE.slip44, ASSET_NAMESPACE.erc20, ASSET_NAMESPACE.erc721],
  [CHAIN_NAMESPACE.CosmosSdk]: [
    ASSET_NAMESPACE.cw20,
    ASSET_NAMESPACE.cw721,
    ASSET_NAMESPACE.ibc,
    ASSET_NAMESPACE.native,
    ASSET_NAMESPACE.slip44,
  ],
})
