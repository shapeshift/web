import type { AssetId, AssetNamespace } from './assetId/assetId'
import type { ChainId, ChainNamespace, ChainReference } from './chainId/chainId'

export const btcAssetId: AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
export const bchAssetId: AssetId = 'bip122:000000000000000000651ef99cb9fcbe/slip44:145'
export const dogeAssetId: AssetId = 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3'
export const ltcAssetId: AssetId = 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'
export const zecAssetId: AssetId = 'bip122:00040fe8ec8471911baa1db1266ea15d/slip44:133'

export const ethAssetId: AssetId = 'eip155:1/slip44:60'
export const avalancheAssetId: AssetId = 'eip155:43114/slip44:60'
export const optimismAssetId: AssetId = 'eip155:10/slip44:60'
export const bscAssetId: AssetId = 'eip155:56/slip44:60'
export const polygonAssetId: AssetId = 'eip155:137/slip44:60'
export const gnosisAssetId: AssetId = 'eip155:100/slip44:60'
export const arbitrumAssetId: AssetId = 'eip155:42161/slip44:60'
export const arbitrumNovaAssetId: AssetId = 'eip155:42170/slip44:60'
export const baseAssetId: AssetId = 'eip155:8453/slip44:60'
export const monadAssetId: AssetId = 'eip155:143/slip44:60'
export const plasmaAssetId: AssetId = 'eip155:9745/slip44:60'
export const solAssetId: AssetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501'
export const wrappedSolAssetId: AssetId =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:So11111111111111111111111111111111111111112'
export const tronAssetId: AssetId = 'tron:0x2b6653dc/slip44:195'
export const suiAssetId: AssetId = 'sui:35834a8a/slip44:784'
export const uniV2EthFoxArbitrumAssetId: AssetId =
  'eip155:42161/erc20:0x5f6ce0ca13b87bd738519545d3e018e70e339c24'

export const foxatarAssetId: AssetId =
  'eip155:137/erc721:0x2e727c425a11ce6b8819b3004db332c12d2af2a2'

export const foxyAssetId: AssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'
export const foxOnGnosisAssetId: AssetId =
  'eip155:100/erc20:0x21a42669643f45bc0e086b8fc2ed70c23d67509d'
export const foxOnArbitrumOneAssetId: AssetId =
  'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73'
export const foxAssetId: AssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const foxOnOptimismAssetId: AssetId =
  'eip155:10/erc20:0xf1a0da3367bc7aa04f8d94ba57b862ff37ced174'
export const foxOnPolygonAssetId: AssetId =
  'eip155:137/erc20:0x65a05db8322701724c197af82c9cae41195b0aa8'
export const usdtAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'
export const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const usdcOnArbitrumOneAssetId: AssetId =
  'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831'
export const usdcOnSolanaAssetId: AssetId =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const flipAssetId: AssetId = 'eip155:1/erc20:0x826180541412d574cf1336d22c0c0a287822678a'

export const foxWifHatAssetId: AssetId =
  'eip155:8453/erc20:0xd14acd73ade7f3c652f05365115f015e905a6bf4'

export const cosmosAssetId: AssetId = 'cosmos:cosmoshub-4/slip44:118'
export const thorchainAssetId: AssetId = 'cosmos:thorchain-1/slip44:931'
export const tcyAssetId: AssetId = 'cosmos:thorchain-1/slip44:tcy'
export const rujiAssetId: AssetId = 'cosmos:thorchain-1/slip44:ruji'
export const mayachainAssetId: AssetId = 'cosmos:mayachain-mainnet-v1/slip44:931'
export const binanceAssetId: AssetId = 'cosmos:binance-chain-tigris/slip44:714'

export const btcChainId: ChainId = 'bip122:000000000019d6689c085ae165831e93'
export const bchChainId: ChainId = 'bip122:000000000000000000651ef99cb9fcbe'
export const dogeChainId: ChainId = 'bip122:00000000001a91e3dace36e2be3bf030'
export const ltcChainId: ChainId = 'bip122:12a765e31ffd4059bada1e25190f6e98'
export const zecChainId: ChainId = 'bip122:00040fe8ec8471911baa1db1266ea15d'

export const ethChainId: ChainId = 'eip155:1'
export const avalancheChainId: ChainId = 'eip155:43114'
export const optimismChainId: ChainId = 'eip155:10'
export const bscChainId: ChainId = 'eip155:56'
export const polygonChainId: ChainId = 'eip155:137'
export const gnosisChainId: ChainId = 'eip155:100'
export const arbitrumChainId: ChainId = 'eip155:42161'
export const arbitrumNovaChainId: ChainId = 'eip155:42170'
export const baseChainId: ChainId = 'eip155:8453'
export const monadChainId: ChainId = 'eip155:143'
export const plasmaChainId: ChainId = 'eip155:9745'

export const cosmosChainId: ChainId = 'cosmos:cosmoshub-4'
export const thorchainChainId: ChainId = 'cosmos:thorchain-1'
export const mayachainChainId: ChainId = 'cosmos:mayachain-mainnet-v1'
export const binanceChainId: ChainId = 'cosmos:binance-chain-tigris'

export const solanaChainId: ChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
export const tronChainId: ChainId = 'tron:0x2b6653dc'
export const suiChainId: ChainId = 'sui:35834a8a'

export const CHAIN_NAMESPACE = {
  Evm: 'eip155',
  Utxo: 'bip122',
  CosmosSdk: 'cosmos',
  Solana: 'solana',
  Tron: 'tron',
  Sui: 'sui',
} as const

type ValidChainMap = {
  [k in ChainNamespace]: ChainReference[]
}

export const CHAIN_REFERENCE = {
  EthereumMainnet: '1',
  BitcoinMainnet: '000000000019d6689c085ae165831e93',
  BitcoinCashMainnet: '000000000000000000651ef99cb9fcbe',
  DogecoinMainnet: '00000000001a91e3dace36e2be3bf030',
  LitecoinMainnet: '12a765e31ffd4059bada1e25190f6e98',
  ZcashMainnet: '00040fe8ec8471911baa1db1266ea15d',
  CosmosHubMainnet: 'cosmoshub-4',
  ThorchainMainnet: 'thorchain-1',
  MayachainMainnet: 'mayachain-mainnet-v1',
  BinanceMainnet: 'binance-chain-tigris', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  AvalancheCChain: '43114', // https://docs.avax.network/apis/avalanchego/apis/c-chain
  OptimismMainnet: '10', //https://community.optimism.io/docs/useful-tools/networks/#optimism-mainnet
  BnbSmartChainMainnet: '56', // https://docs.bnbchain.org/docs/wallet_api/#chain-ids
  PolygonMainnet: '137', // https://wiki.polygon.technology/docs/develop/metamask/config-polygon-on-metamask/
  GnosisMainnet: '100', // https://docs.gnosischain.com/tools/wallets/metamask/
  ArbitrumMainnet: '42161', // https://chainlist.org/chain/42161
  ArbitrumNovaMainnet: '42170', // https://chainlist.org/chain/42170
  BaseMainnet: '8453', // https://chainlist.org/chain/8453
  MonadMainnet: '143', // https://docs.monad.xyz/developer-essentials/network-information
  PlasmaMainnet: '9745', // https://chainlist.org/chain/9745
  SolanaMainnet: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // https://namespaces.chainagnostic.org/solana/caip2
  TronMainnet: '0x2b6653dc', // https://developers.tron.network/docs/networks
  SuiMainnet: '35834a8a', // First 8 chars of SUI mainnet genesis hash
} as const

export const ASSET_NAMESPACE = {
  erc20: 'erc20',
  erc721: 'erc721',
  erc1155: 'erc1155',
  slip44: 'slip44',
  splToken: 'token',
  trc20: 'trc20',
  trc10: 'trc10',
  suiCoin: 'coin',
} as const

export const ASSET_REFERENCE = {
  Bitcoin: '0',
  BitcoinCash: '145',
  Litecoin: '2',
  Dogecoin: '3',
  Zcash: '133',
  Cosmos: '118',
  Thorchain: '931',
  Mayachain: '931',
  Binance: '714',
  Ethereum: '60',
  AvalancheC: '60', // evm chain which uses ethereum derivation path as common practice
  Optimism: '60', // evm chain which uses ethereum derivation path as common practice
  BnbSmartChain: '60', // evm chain which uses ethereum derivation path as common practice
  Polygon: '60', // evm chain which uses ethereum derivation path as common practice
  Gnosis: '60', // evm chain which uses ethereum derivation path as common practice
  Arbitrum: '60', // evm chain which uses ethereum derivation path as common practice
  ArbitrumNova: '60', // evm chain which uses ethereum derivation path as common practice
  Base: '60', // evm chain which uses ethereum derivation path as common practice
  Monad: '60', // evm chain which uses ethereum derivation path as common practice
  Plasma: '60', // evm chain which uses ethereum derivation path as common practice
  Solana: '501',
  Tron: '195',
  Sui: '784',
} as const

export const VALID_CHAIN_IDS: ValidChainMap = Object.freeze({
  [CHAIN_NAMESPACE.Utxo]: [
    CHAIN_REFERENCE.BitcoinMainnet,
    CHAIN_REFERENCE.BitcoinCashMainnet,
    CHAIN_REFERENCE.DogecoinMainnet,
    CHAIN_REFERENCE.LitecoinMainnet,
    CHAIN_REFERENCE.ZcashMainnet,
  ],
  [CHAIN_NAMESPACE.Evm]: [
    CHAIN_REFERENCE.EthereumMainnet,
    CHAIN_REFERENCE.AvalancheCChain,
    CHAIN_REFERENCE.OptimismMainnet,
    CHAIN_REFERENCE.BnbSmartChainMainnet,
    CHAIN_REFERENCE.PolygonMainnet,
    CHAIN_REFERENCE.GnosisMainnet,
    CHAIN_REFERENCE.ArbitrumMainnet,
    CHAIN_REFERENCE.ArbitrumNovaMainnet,
    CHAIN_REFERENCE.BaseMainnet,
    CHAIN_REFERENCE.MonadMainnet,
    CHAIN_REFERENCE.PlasmaMainnet,
  ],
  [CHAIN_NAMESPACE.CosmosSdk]: [
    CHAIN_REFERENCE.CosmosHubMainnet,
    CHAIN_REFERENCE.ThorchainMainnet,
    CHAIN_REFERENCE.MayachainMainnet,
    CHAIN_REFERENCE.BinanceMainnet,
  ],
  [CHAIN_NAMESPACE.Solana]: [CHAIN_REFERENCE.SolanaMainnet],
  [CHAIN_NAMESPACE.Tron]: [CHAIN_REFERENCE.TronMainnet],
  [CHAIN_NAMESPACE.Sui]: [CHAIN_REFERENCE.SuiMainnet],
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
  ],
  [CHAIN_NAMESPACE.CosmosSdk]: [ASSET_NAMESPACE.slip44],
  [CHAIN_NAMESPACE.Solana]: [ASSET_NAMESPACE.splToken, ASSET_NAMESPACE.slip44],
  [CHAIN_NAMESPACE.Tron]: [ASSET_NAMESPACE.slip44, ASSET_NAMESPACE.trc20],
  [CHAIN_NAMESPACE.Sui]: [ASSET_NAMESPACE.slip44, ASSET_NAMESPACE.suiCoin],
})

// We should prob change this once we add more chains
export const FEE_ASSET_IDS = [
  ethAssetId,
  btcAssetId,
  bchAssetId,
  cosmosAssetId,
  thorchainAssetId,
  mayachainAssetId,
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
  monadAssetId,
  solAssetId,
  tronAssetId,
  suiAssetId,
  zecAssetId,
]
