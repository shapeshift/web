import type { ChainId, Nominal } from '@shapeshiftoss/caip'
import type {
  BTCSignTx,
  CosmosSignTx,
  ETHSignTx,
  HDWallet,
  MayachainSignTx,
  SolanaSignTx,
  SuiSignTx,
  ThorchainSignTx,
} from '@shapeshiftoss/hdwallet-core'
import type {
  ChainSpecific,
  KnownChainIds,
  UtxoAccountType,
  UtxoChainId,
} from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import type PQueue from 'p-queue'

import type * as cosmossdk from './cosmossdk/types'
import type * as evm from './evm/types'
import type * as solana from './solana/types'
import type * as sui from './sui/types'
import type * as tron from './tron/types'
import type * as utxo from './utxo/types'

// this placeholder forces us to be explicit about transactions not transferring funds to humans
export type ContractInteraction = Nominal<'contract-interaction', 'ContractInteraction'>
export const CONTRACT_INTERACTION: ContractInteraction = 'contract-interaction' as const

type ChainSpecificAccount<T> = ChainSpecific<
  T,
  {
    [KnownChainIds.EthereumMainnet]: evm.Account
    [KnownChainIds.AvalancheMainnet]: evm.Account
    [KnownChainIds.OptimismMainnet]: evm.Account
    [KnownChainIds.BnbSmartChainMainnet]: evm.Account
    [KnownChainIds.PolygonMainnet]: evm.Account
    [KnownChainIds.GnosisMainnet]: evm.Account
    [KnownChainIds.ArbitrumMainnet]: evm.Account
    [KnownChainIds.ArbitrumNovaMainnet]: evm.Account
    [KnownChainIds.BaseMainnet]: evm.Account
    [KnownChainIds.MonadMainnet]: evm.Account
    [KnownChainIds.BitcoinMainnet]: utxo.Account
    [KnownChainIds.BitcoinCashMainnet]: utxo.Account
    [KnownChainIds.DogecoinMainnet]: utxo.Account
    [KnownChainIds.LitecoinMainnet]: utxo.Account
    [KnownChainIds.CosmosMainnet]: cosmossdk.Account
    [KnownChainIds.ThorchainMainnet]: cosmossdk.Account
    [KnownChainIds.MayachainMainnet]: cosmossdk.Account
    [KnownChainIds.SolanaMainnet]: solana.Account
    [KnownChainIds.TronMainnet]: tron.Account
    [KnownChainIds.SuiMainnet]: sui.Account
  }
>

export type Account<T extends ChainId> = {
  balance: string
  pubkey: string
  chainId: string
  assetId: string
  chain: T
} & ChainSpecificAccount<T>

export type AssetBalance = {
  balance: string
  assetId: string
}

export enum FeeDataKey {
  Slow = 'slow',
  Average = 'average',
  Fast = 'fast',
}

type ChainSpecificFeeData<T> = ChainSpecific<
  T,
  {
    [KnownChainIds.EthereumMainnet]: evm.FeeData
    [KnownChainIds.AvalancheMainnet]: evm.FeeData
    [KnownChainIds.OptimismMainnet]: evm.FeeData
    [KnownChainIds.BnbSmartChainMainnet]: evm.FeeData
    [KnownChainIds.PolygonMainnet]: evm.FeeData
    [KnownChainIds.GnosisMainnet]: evm.FeeData
    [KnownChainIds.ArbitrumMainnet]: evm.FeeData
    [KnownChainIds.ArbitrumNovaMainnet]: evm.FeeData
    [KnownChainIds.BaseMainnet]: evm.FeeData
    [KnownChainIds.MonadMainnet]: evm.FeeData
    [KnownChainIds.BitcoinMainnet]: utxo.FeeData
    [KnownChainIds.BitcoinCashMainnet]: utxo.FeeData
    [KnownChainIds.DogecoinMainnet]: utxo.FeeData
    [KnownChainIds.LitecoinMainnet]: utxo.FeeData
    [KnownChainIds.CosmosMainnet]: cosmossdk.FeeData
    [KnownChainIds.ThorchainMainnet]: cosmossdk.FeeData
    [KnownChainIds.MayachainMainnet]: cosmossdk.FeeData
    [KnownChainIds.SolanaMainnet]: solana.FeeData
    [KnownChainIds.TronMainnet]: tron.FeeData
    [KnownChainIds.SuiMainnet]: sui.FeeData
  }
>

export type FeeData<T extends ChainId> = {
  txFee: string
} & ChainSpecificFeeData<T>

export type FeeDataEstimate<T extends ChainId> = {
  [FeeDataKey.Slow]: FeeData<T>
  [FeeDataKey.Average]: FeeData<T>
  [FeeDataKey.Fast]: FeeData<T>
}

export type SubscribeTxsInput = {
  wallet: HDWallet
  accountNumber: number
  accountType?: UtxoAccountType
  pubKey?: string
}

export type GetBip44ParamsInput = {
  accountNumber: number
  accountType?: UtxoAccountType
  addressIndex?: number
  isChange?: boolean
}

export type TransferType = unchained.TransferType
export type TradeType = unchained.TradeType

export type TxMetadata =
  | unchained.evm.TxMetadata
  | unchained.cosmossdk.TxMetadata
  | unchained.utxo.TxMetadata

export type Transaction = Omit<unchained.StandardTx, 'address' | 'transfers'> & {
  pubkey: string
  transfers: TxTransfer[]
  data?: TxMetadata
}

export type TxTransfer = Omit<unchained.Transfer, 'components' | 'totalValue' | 'from' | 'to'> & {
  from: string[]
  to: string[]
  value: string
}

export type SubscribeError = {
  message: string
}

export type TxHistoryResponse = {
  cursor: string
  pubkey: string
  transactions: Transaction[]
  txIds: string[]
}

export type ChainSignTx = {
  [KnownChainIds.EthereumMainnet]: ETHSignTx
  [KnownChainIds.AvalancheMainnet]: ETHSignTx
  [KnownChainIds.OptimismMainnet]: ETHSignTx
  [KnownChainIds.BnbSmartChainMainnet]: ETHSignTx
  [KnownChainIds.PolygonMainnet]: ETHSignTx
  [KnownChainIds.GnosisMainnet]: ETHSignTx
  [KnownChainIds.ArbitrumMainnet]: ETHSignTx
  [KnownChainIds.ArbitrumNovaMainnet]: ETHSignTx
  [KnownChainIds.BaseMainnet]: ETHSignTx
  [KnownChainIds.MonadMainnet]: ETHSignTx
  [KnownChainIds.BitcoinMainnet]: BTCSignTx
  [KnownChainIds.BitcoinCashMainnet]: BTCSignTx
  [KnownChainIds.DogecoinMainnet]: BTCSignTx
  [KnownChainIds.LitecoinMainnet]: BTCSignTx
  [KnownChainIds.CosmosMainnet]: CosmosSignTx
  [KnownChainIds.ThorchainMainnet]: ThorchainSignTx
  [KnownChainIds.MayachainMainnet]: MayachainSignTx
  [KnownChainIds.SolanaMainnet]: SolanaSignTx
  [KnownChainIds.TronMainnet]: tron.TronSignTx
  [KnownChainIds.SuiMainnet]: SuiSignTx
}

export type SignTx<T extends ChainId> = T extends keyof ChainSignTx ? ChainSignTx[T] : never

export type BuildSendTxInput<T extends ChainId> = {
  to: string
  value: string
  wallet: HDWallet
  accountNumber: number
  sendMax?: boolean
  memo?: string
  customNonce?: string
  pubKey?: string
} & ChainSpecificBuildTxData<T>

export type BuildSendApiTxInput<T extends KnownChainIds> = Omit<BuildSendTxInput<T>, 'wallet'> & {
  from: string
}

export type UtxoBuildSendApiTxInput<T extends UtxoChainId> = Omit<BuildSendTxInput<T>, 'wallet'> & {
  xpub: string
  /** Explicit skip of `to` address validation. Use with extreme care (ex. thorchain vault address) */
  skipToAddressValidation?: boolean
}

export type ChainSpecificBuildTxData<T> = ChainSpecific<
  T,
  {
    [KnownChainIds.EthereumMainnet]: evm.BuildTxInput
    [KnownChainIds.AvalancheMainnet]: evm.BuildTxInput
    [KnownChainIds.OptimismMainnet]: evm.BuildTxInput
    [KnownChainIds.BnbSmartChainMainnet]: evm.BuildTxInput
    [KnownChainIds.PolygonMainnet]: evm.BuildTxInput
    [KnownChainIds.GnosisMainnet]: evm.BuildTxInput
    [KnownChainIds.ArbitrumMainnet]: evm.BuildTxInput
    [KnownChainIds.ArbitrumNovaMainnet]: evm.BuildTxInput
    [KnownChainIds.BaseMainnet]: evm.BuildTxInput
    [KnownChainIds.MonadMainnet]: evm.BuildTxInput
    [KnownChainIds.BitcoinMainnet]: utxo.BuildTxInput
    [KnownChainIds.BitcoinCashMainnet]: utxo.BuildTxInput
    [KnownChainIds.DogecoinMainnet]: utxo.BuildTxInput
    [KnownChainIds.LitecoinMainnet]: utxo.BuildTxInput
    [KnownChainIds.CosmosMainnet]: cosmossdk.BuildTxInput
    [KnownChainIds.ThorchainMainnet]: cosmossdk.BuildTxInput
    [KnownChainIds.MayachainMainnet]: cosmossdk.BuildTxInput
    [KnownChainIds.SolanaMainnet]: solana.BuildTxInput
    [KnownChainIds.TronMainnet]: tron.BuildTxInput
    [KnownChainIds.SuiMainnet]: sui.BuildTxInput
  }
>

type BuildValidatorTxInput<T extends ChainId> = Omit<BuildSendTxInput<T>, 'to'> & {
  validator: string
}

export type BuildDelegateTxInput<T extends ChainId> = BuildValidatorTxInput<T>

export type BuildUndelegateTxInput<T extends ChainId> = BuildValidatorTxInput<T>

export type BuildClaimRewardsTxInput<T extends ChainId> = Omit<BuildValidatorTxInput<T>, 'value'>

export type BuildRedelegateTxInput<T extends ChainId> = Omit<BuildSendTxInput<T>, 'to'> & {
  fromValidator: string
  toValidator: string
}

export type BuildDepositTxInput<T extends KnownChainIds> = Omit<BuildSendApiTxInput<T>, 'to'> & {
  memo: string
}

type BuildLPTxInput<T extends ChainId> = Omit<BuildSendTxInput<T>, 'to' | 'value'> & {
  poolId: string
}

export type BuildLPAddTxInput<T extends ChainId> = BuildLPTxInput<T> & {
  tokenInMaxs: [{ denom: string; amount: string }, { denom: string; amount: string }]
  shareOutAmount: string
}

export type BuildLPRemoveTxInput<T extends ChainId> = BuildLPTxInput<T> & {
  tokenOutMins: [{ denom: string; amount: string }, { denom: string; amount: string }]
  shareInAmount: string
}

export type SignTxInput<TxType> = {
  txToSign: TxType
  wallet: HDWallet
}

export type SignMessageInput<MessageType> = {
  messageToSign: MessageType
  wallet: HDWallet
}

export type SignTypedDataInput<TypedDataType> = {
  typedDataToSign: TypedDataType
  wallet: HDWallet
}

export interface TxHistoryInput {
  readonly cursor?: string
  readonly pubkey: string
  readonly pageSize?: number
  readonly requestQueue?: PQueue
  readonly knownTxIds?: Set<string>
}

export type GetAddressInputBase = {
  wallet: HDWallet | null
  accountNumber: number
  isChange?: boolean
  addressIndex?: number
  /**
   * Request that the address be shown to the user by the device, if supported
   */
  showOnDevice?: boolean
  /**
   * An optional public key to be passed, which will bypass the HD wallet derivation
   * and instead use unchained to "derive" the address from the public key
   */
  pubKey?: string
}

export type GetAddressInput = GetAddressInputBase | utxo.GetAddressInput

type ChainSpecificGetFeeDataInput<T> = ChainSpecific<
  T,
  {
    [KnownChainIds.EthereumMainnet]: evm.GetFeeDataInput
    [KnownChainIds.AvalancheMainnet]: evm.GetFeeDataInput
    [KnownChainIds.OptimismMainnet]: evm.GetFeeDataInput
    [KnownChainIds.BnbSmartChainMainnet]: evm.GetFeeDataInput
    [KnownChainIds.PolygonMainnet]: evm.GetFeeDataInput
    [KnownChainIds.GnosisMainnet]: evm.GetFeeDataInput
    [KnownChainIds.ArbitrumMainnet]: evm.GetFeeDataInput
    [KnownChainIds.ArbitrumNovaMainnet]: evm.GetFeeDataInput
    [KnownChainIds.BaseMainnet]: evm.GetFeeDataInput
    [KnownChainIds.MonadMainnet]: evm.GetFeeDataInput
    [KnownChainIds.BitcoinMainnet]: utxo.GetFeeDataInput
    [KnownChainIds.BitcoinCashMainnet]: utxo.GetFeeDataInput
    [KnownChainIds.DogecoinMainnet]: utxo.GetFeeDataInput
    [KnownChainIds.LitecoinMainnet]: utxo.GetFeeDataInput
    [KnownChainIds.SolanaMainnet]: solana.GetFeeDataInput
    [KnownChainIds.SuiMainnet]: sui.GetFeeDataInput
    [KnownChainIds.TronMainnet]: tron.GetFeeDataInput
  }
>
export type GetFeeDataInput<T extends ChainId> = {
  // Optional hex-encoded calldata for EVM chains, UTF-8 for others
  // NOT to be used with ERC20s since this will be used in-place of the ERC20 calldata
  memo?: string
  to: string
  value: string
  sendMax?: boolean
} & ChainSpecificGetFeeDataInput<T>

export enum ValidAddressResultType {
  Valid = 'valid',
  Invalid = 'invalid',
}

export type ValidAddressResult = {
  /** Is this Address valid */
  valid: boolean
  /** Result type of valid address */
  result: ValidAddressResultType
}

export type ZrxFeeResult = {
  fast: number
  instant: number
  low: number
  source:
    | 'ETH_GAS_STATION'
    | 'ETHERSCAN'
    | 'ETHERCHAIN'
    | 'GAS_NOW'
    | 'MY_CRYPTO'
    | 'UP_VEST'
    | 'GETH_PENDING'
    | 'MEDIAN'
    | 'AVERAGE'
  standard: number
  timestamp: number
}

export type ZrxGasApiResponse = {
  result: ZrxFeeResult[]
}

export enum ChainAdapterDisplayName {
  Thorchain = 'THORChain',
  Mayachain = 'MAYAChain',
  Ethereum = 'Ethereum',
  Avalanche = 'Avalanche C-Chain',
  Optimism = 'Optimism',
  BnbSmartChain = 'BNB Smart Chain',
  Polygon = 'Polygon',
  Gnosis = 'Gnosis',
  Arbitrum = 'Arbitrum One',
  ArbitrumNova = 'Arbitrum Nova',
  Base = 'Base',
  Monad = 'Monad',
  Cosmos = 'Cosmos',
  Bitcoin = 'Bitcoin',
  BitcoinCash = 'Bitcoin Cash',
  Dogecoin = 'Dogecoin',
  Litecoin = 'Litecoin',
  Solana = 'Solana',
  Tron = 'Tron',
  Sui = 'Sui',
}

export type BroadcastTransactionInput = {
  senderAddress: string
  receiverAddress: string | ContractInteraction
  hex: string
}

export type SignAndBroadcastTransactionInput<T extends ChainId> = {
  senderAddress: string
  receiverAddress: string | ContractInteraction
  signTxInput: SignTxInput<SignTx<T>>
}
