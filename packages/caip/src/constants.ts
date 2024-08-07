import type { AssetId, AssetNamespace } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'

export const btcAssetId: AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
export const bchAssetId: AssetId = 'bip122:000000000000000000651ef99cb9fcbe/slip44:145'
export const dogeAssetId: AssetId = 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3'
export const ltcAssetId: AssetId = 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'

export const ethAssetId: AssetId = 'eip155:1/slip44:60'
export const avalancheAssetId: AssetId = 'eip155:43114/slip44:60'
export const optimismAssetId: AssetId = 'eip155:10/slip44:60'
export const bscAssetId: AssetId = 'eip155:56/slip44:60'
export const polygonAssetId: AssetId = 'eip155:137/slip44:60'
export const gnosisAssetId: AssetId = 'eip155:100/slip44:60'
export const arbitrumAssetId: AssetId = 'eip155:42161/slip44:60'
export const arbitrumNovaAssetId: AssetId = 'eip155:42170/slip44:60'
export const baseAssetId: AssetId = 'eip155:8453/slip44:60'

export const foxOnGnosisAssetId: AssetId =
  'eip155:100/erc20:0x21a42669643f45bc0e086b8fc2ed70c23d67509d'
export const foxOnArbitrumOneAssetId: AssetId =
  'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73'
export const foxAssetId: AssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const foxatarAssetId: AssetId =
  'eip155:137/erc721:0x2e727c425a11ce6b8819b3004db332c12d2af2a2'
export const foxyAssetId: AssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'

export const cosmosAssetId: AssetId = 'cosmos:cosmoshub-4/slip44:118'
export const thorchainAssetId: AssetId = 'cosmos:thorchain-mainnet-v2/slip44:931'
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
export const optimismChainId: ChainId = 'eip155:10'
export const bscChainId: ChainId = 'eip155:56'
export const polygonChainId: ChainId = 'eip155:137'
export const gnosisChainId: ChainId = 'eip155:100'
export const arbitrumChainId: ChainId = 'eip155:42161'
export const arbitrumNovaChainId: ChainId = 'eip155:42170'
export const baseChainId: ChainId = 'eip155:8453'

export const cosmosChainId: ChainId = 'cosmos:cosmoshub-4'
export const thorchainChainId: ChainId = 'cosmos:thorchain-mainnet-v2'
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
  ThorchainMainnet: 'thorchain-mainnet-v2',
  AvalancheCChain: '43114', // https://docs.avax.network/apis/avalanchego/apis/c-chain
  BinanceMainnet: 'binance-chain-tigris', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  BinanceTestnet: 'binance-chain-ganges', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  KavaMainnet: 'kava_2222-10', // https://github.com/Kava-Labs/rosetta-kava/blob/1c04619078a8d3293e296c66eb322c505589f2d6/services/construction_payloads.go#L115
  KavaTestnet: 'kava_2221-16000', // https://github.com/Kava-Labs/rosetta-kava/blob/1c04619078a8d3293e296c66eb322c505589f2d6/services/construction_payloads.go#L117
  TerraMainnet: 'phoenix-1', // https://docs.terra.money/full-node/run-a-full-terra-node/join-a-network/
  TerraTestnet: 'pisco-1', // https://docs.terra.money/full-node/run-a-full-terra-node/join-a-network/
  SecretMainnet: 'secret-4', // https://docs.scrt.network/secret-network-documentation/development/api-endpoints
  SecretTestnet: 'pulsar-2', // https://docs.scrt.network/secret-network-documentation/development/api-endpoints
  OptimismMainnet: '10', //https://community.optimism.io/docs/useful-tools/networks/#optimism-mainnet
  BnbSmartChainMainnet: '56', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  PolygonMainnet: '137', // https://wiki.polygon.technology/docs/develop/metamask/config-polygon-on-metamask/
  GnosisMainnet: '100', // https://docs.gnosischain.com/tools/wallets/metamask/
  ArbitrumMainnet: '42161', // https://chainlist.org/chain/42161
  ArbitrumNovaMainnet: '42170', // https://chainlist.org/chain/42170
  BaseMainnet: '8453', // https://chainlist.org/chain/8453
} as const

export const ASSET_NAMESPACE = {
  cw20: 'cw20',
  cw721: 'cw721',
  erc20: 'erc20',
  erc721: 'erc721',
  erc1155: 'erc1155',
  bep20: 'bep20',
  bep721: 'bep721',
  bep1155: 'bep1155',
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
  Thorchain: '931',
  BitcoinCash: '145',
  AvalancheC: '60', // evm chain which uses ethereum derivation path as common practice
  Binance: '714',
  Kava: '459',
  Terra: '330',
  Secret: '529',
  Optimism: '60', // evm chain which uses ethereum derivation path as common practice
  BnbSmartChain: '60', // evm chain which uses ethereum derivation path as common practice
  Polygon: '60', // evm chain which uses ethereum derivation path as common practice
  Gnosis: '60', // evm chain which uses ethereum derivation path as common practice
  Arbitrum: '60', // evm chain which uses ethereum derivation path as common practice
  ArbitrumNova: '60', // evm chain which uses ethereum derivation path as common practice
  Base: '60', // evm chain which uses ethereum derivation path as common practice
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
    CHAIN_REFERENCE.OptimismMainnet,
    CHAIN_REFERENCE.BnbSmartChainMainnet,
    CHAIN_REFERENCE.PolygonMainnet,
    CHAIN_REFERENCE.GnosisMainnet,
    CHAIN_REFERENCE.ArbitrumMainnet,
    CHAIN_REFERENCE.ArbitrumNovaMainnet,
    CHAIN_REFERENCE.BaseMainnet,
  ],
  [CHAIN_NAMESPACE.CosmosSdk]: [
    CHAIN_REFERENCE.CosmosHubMainnet,
    CHAIN_REFERENCE.CosmosHubVega,
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
  [CHAIN_NAMESPACE.Evm]: [
    ASSET_NAMESPACE.slip44,
    ASSET_NAMESPACE.erc20,
    ASSET_NAMESPACE.erc721,
    ASSET_NAMESPACE.erc1155,
    ASSET_NAMESPACE.bep20,
    ASSET_NAMESPACE.bep721,
    ASSET_NAMESPACE.bep1155,
  ],
  [CHAIN_NAMESPACE.CosmosSdk]: [
    ASSET_NAMESPACE.cw20,
    ASSET_NAMESPACE.cw721,
    ASSET_NAMESPACE.ibc,
    ASSET_NAMESPACE.native,
    ASSET_NAMESPACE.slip44,
  ],
})

// We should prob change this once we add more chains
export const FEE_ASSET_IDS = [
  ethAssetId,
  btcAssetId,
  bchAssetId,
  cosmosAssetId,
  thorchainAssetId,
  dogeAssetId,
  ltcAssetId,
  avalancheAssetId,
  optimismAssetId,
  bscAssetId,
  polygonAssetId,
  gnosisAssetId,
  arbitrumAssetId,
  arbitrumNovaAssetId,
  baseAssetId,
]
