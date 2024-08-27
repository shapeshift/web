import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { AccountMetadataById, PartialRecord } from '@shapeshiftoss/types'
import type { Nominal } from 'types/common'

export type PortfolioAccount = {
  /** The asset ids belonging to an account */
  assetIds: AssetId[]
  hasActivity?: boolean
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

export type ConnectWallet = {
  /**
   * the currently connected wallet id, used to determine which accounts to index into
   */
  id: WalletId
  name: string
  supportedChainIds: ChainId[]
}

export type Portfolio = {
  /**
   * The app can run account discovery taking a lot of time and slowing down the portfolio initialization,
   * we use this key to gracefully handle this state in any part of the app
   */
  isAccountLoading: boolean
  /**
   * lookup of accountId -> accountMetadata
   */
  accountMetadata: PortfolioAccountMetadata
  accounts: PortfolioAccounts
  accountBalances: PortfolioAccountBalances
  /**
   * The `AccountId[]` that are enabled. Rather than removing the accounts and adding complexity
   * to the actions and state management, we enable them here and filter them out in the selectors.
   */
  enabledAccountIds: PartialRecord<WalletId, AccountId[]>
  /**
   * 1:many mapping of a unique wallet id -> multiple account ids
   */
  wallet: PortfolioWallet
  connectedWallet?: ConnectWallet
}

export const initialState: Portfolio = {
  isAccountLoading: false,
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
  enabledAccountIds: {},
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
