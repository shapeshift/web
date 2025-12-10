import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'

import type { PartialRecord } from './utility'

export type RootBip44Params = {
  purpose: number
  coinType: number
  accountNumber: number
}

export type Bip44Params = RootBip44Params & {
  isChange: boolean | undefined
  addressIndex: number | undefined
}

export enum KnownChainIds {
  EthereumMainnet = 'eip155:1',
  AvalancheMainnet = 'eip155:43114',
  OptimismMainnet = 'eip155:10',
  BnbSmartChainMainnet = 'eip155:56',
  PolygonMainnet = 'eip155:137',
  GnosisMainnet = 'eip155:100',
  ArbitrumMainnet = 'eip155:42161',
  ArbitrumNovaMainnet = 'eip155:42170',
  BaseMainnet = 'eip155:8453',
  MonadMainnet = 'eip155:143',
  PlasmaMainnet = 'eip155:9745',
  BitcoinMainnet = 'bip122:000000000019d6689c085ae165831e93',
  BitcoinCashMainnet = 'bip122:000000000000000000651ef99cb9fcbe',
  DogecoinMainnet = 'bip122:00000000001a91e3dace36e2be3bf030',
  LitecoinMainnet = 'bip122:12a765e31ffd4059bada1e25190f6e98',
  ZcashMainnet = 'bip122:00040fe8ec8471911baa1db1266ea15d',
  CosmosMainnet = 'cosmos:cosmoshub-4',
  ThorchainMainnet = 'cosmos:thorchain-1',
  MayachainMainnet = 'cosmos:mayachain-mainnet-v1',
  SolanaMainnet = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  TronMainnet = 'tron:0x2b6653dc',
  SuiMainnet = 'sui:35834a8a',
}

export type EvmChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.BnbSmartChainMainnet
  | KnownChainIds.PolygonMainnet
  | KnownChainIds.GnosisMainnet
  | KnownChainIds.ArbitrumMainnet
  | KnownChainIds.ArbitrumNovaMainnet
  | KnownChainIds.BaseMainnet
  | KnownChainIds.MonadMainnet
  | KnownChainIds.PlasmaMainnet

export type CosmosSdkChainId =
  | KnownChainIds.CosmosMainnet
  | KnownChainIds.ThorchainMainnet
  | KnownChainIds.MayachainMainnet

export type ThorMayaChainId = KnownChainIds.ThorchainMainnet | KnownChainIds.MayachainMainnet

export type UtxoChainId =
  | KnownChainIds.BitcoinMainnet
  | KnownChainIds.BitcoinCashMainnet
  | KnownChainIds.DogecoinMainnet
  | KnownChainIds.LitecoinMainnet
  | KnownChainIds.ZcashMainnet

export type TronChainId = KnownChainIds.TronMainnet

export type SuiChainId = KnownChainIds.SuiMainnet

export enum WithdrawType {
  DELAYED,
  INSTANT,
}

export enum UtxoAccountType {
  SegwitNative = 'SegwitNative',
  SegwitP2sh = 'SegwitP2sh',
  P2pkh = 'P2pkh',
}

export type Asset = {
  assetId: AssetId
  chainId: ChainId
  description?: string
  isTrustedDescription?: boolean
  symbol: string
  name: string
  id?: string
  networkName?: string
  precision: number
  color: string
  networkColor?: string
  icon: string | undefined
  icons?: string[]
  networkIcon?: string
  explorer: string
  explorerTxLink: string
  explorerAddressLink: string
  relatedAssetKey: AssetId | null | undefined
  isPrimary?: boolean
  isChainSpecific?: boolean
  isPool?: boolean
}

export type AssetsById = Record<AssetId, Asset>
export type AssetsByIdPartial = PartialRecord<AssetId, Asset>

export type AccountMetadata = {
  bip44Params: Bip44Params
  accountType?: UtxoAccountType
}

export type AccountMetadataById = {
  [k: AccountId]: AccountMetadata
}
