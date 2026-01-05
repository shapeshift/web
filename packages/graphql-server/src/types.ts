import type { AssetId, ChainId } from '@shapeshiftoss/caip'

export type TokenBalance = {
  assetId: AssetId
  balance: string
  name?: string
  symbol?: string
  precision?: number
}

export type PortalsEnrichment = {
  isPool?: boolean
  platform?: string
  underlyingTokens?: string[]
  images?: string[]
  liquidity?: number
  apy?: string
  price?: string
  pricePerShare?: string
}

export type EnrichedTokenBalance = TokenBalance & PortalsEnrichment

export type UtxoAddress = {
  pubkey: string
  balance: string
}

export type EvmAccountData = {
  nonce: number
  tokens: TokenBalance[]
}

export type UtxoAccountData = {
  addresses: UtxoAddress[]
  nextChangeAddressIndex?: number
  nextReceiveAddressIndex?: number
}

export type CosmosAccountData = {
  sequence?: string
  accountNumber?: string
  delegations?: unknown
  redelegations?: unknown
  undelegations?: unknown
  rewards?: unknown
}

export type SolanaAccountData = {
  tokens: TokenBalance[]
}

export type Account = {
  id: string
  balance: string
  pubkey: string
  chainId: ChainId
  assetId: AssetId
  tokens: EnrichedTokenBalance[]
  evmData?: EvmAccountData
  utxoData?: UtxoAccountData
  cosmosData?: CosmosAccountData
  solanaData?: SolanaAccountData
}

export type Transfer = {
  type: string
  assetId: AssetId
  value: string
  from: string[]
  to: string[]
}

export type Transaction = {
  txid: string
  pubkey: string
  blockHeight: number | null
  blockTime: number | null
  chainId: ChainId
  status: string
  fee: string | null
  transfers: Transfer[]
}

export type TxHistoryResult = {
  accountId: string
  transactions: Transaction[]
  cursor: string | null
}

export type AccountErrorCode = 'CHAIN_NOT_SUPPORTED' | 'API_ERROR' | 'INVALID_ACCOUNT_ID'

export type AccountError = {
  code: AccountErrorCode
  message: string
  accountId: string
  chainId?: ChainId
}
