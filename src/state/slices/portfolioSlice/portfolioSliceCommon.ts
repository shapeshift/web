import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import type { PartialRecord } from 'lib/utils'
import type { Nominal } from 'types/common'

export type PortfolioAccount = {
  /** The asset ids belonging to an account */
  assetIds: AssetId[]
}

export type PortfolioAccounts = {
  byId: {
    [k: AccountId]: PortfolioAccount
  }
  // a list of accounts in this portfolio
  ids: AccountId[]
}

// aggregated balances across all accounts in a portfolio for the same asset
// balance in base units of asset
export type AssetBalancesById = PartialRecord<AssetId, string>

export type PortfolioAccountBalancesById = {
  [k: AccountId]: AssetBalancesById
}

export type PortfolioAccountBalances = {
  byId: PortfolioAccountBalancesById
  ids: AccountId[]
}

export type AccountMetadata = {
  bip44Params: BIP44Params
  accountType?: UtxoAccountType
}

export type AccountMetadataById = {
  [k: AccountId]: AccountMetadata
}

export type PortfolioAccountMetadata = {
  byId: AccountMetadataById
  ids: AccountId[]
}

export type WalletId = Nominal<string, 'WalletId'>

export type PortfolioWallet = {
  /**
   * a 1:many mapping of a unique wallet id -> multiple account ids
   */
  byId: PartialRecord<WalletId, AccountId[]>
  ids: WalletId[]
}

export type Portfolio = {
  /**
   * lookup of accountId -> accountMetadata
   */
  accountMetadata: PortfolioAccountMetadata
  accounts: PortfolioAccounts
  accountBalances: PortfolioAccountBalances
  /**
   * 1:many mapping of a unique wallet id -> multiple account ids
   */
  wallet: PortfolioWallet
  /**
   * the currently connected wallet id, used to determine which accounts to index into
   */
  walletId?: WalletId
  walletName?: string
}

export const initialState: Portfolio = {
  accounts: {
    byId: {},
    ids: [],
  },
  accountMetadata: {
    byId: {},
    ids: [],
  },
  accountBalances: {
    byId: {},
    ids: [],
  },
  wallet: {
    byId: {},
    ids: [],
  },
}

export enum AssetEquityType {
  Account = 'Account',
  Staking = 'Staking',
  LP = 'LP',
  Reward = 'Reward',
}

export type AssetEquityItem = {
  id: string
  type: AssetEquityType
  fiatAmount: string
  amountCryptoPrecision: string
  provider: string
  color?: string
  underlyingAssetId?: AssetId
}

export type AssetEquityBalance = {
  fiatAmount: string
  amountCryptoPrecision: string
}
