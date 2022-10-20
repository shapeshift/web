import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'

import type { PubKey } from '../validatorDataSlice/validatorDataSlice'

export type Staking = {
  delegations: cosmossdk.Delegation[]
  redelegations: cosmossdk.Redelegation[]
  undelegations: cosmossdk.UndelegationEntry[]
  rewards: cosmossdk.Reward[]
}

type StakingDataParsedByAccountId = Record<AssetId, Staking>
export type StakingDataByValidatorId = Record<PubKey, StakingDataParsedByAccountId>

export type PortfolioAccount = {
  /** The asset ids belonging to an account */
  assetIds: AssetId[]
  /** The list of validators this account is delegated to */
  validatorIds?: PubKey[]
  /** The staking data for per validator, so we can do a join from validatorDataSlice */
  stakingDataByValidatorId?: StakingDataByValidatorId
}

export type PortfolioAccounts = {
  byId: {
    [k: AccountId]: PortfolioAccount
  }
  // a list of accounts in this portfolio
  ids: AccountId[]
}

export type PortfolioBalancesById = {
  // these are aggregated balances across all accounts in a portfolio for the same asset
  // balance in base units of asset - bn doesn't serialize
  [k: AssetId]: string
}

export type PortfolioAssetBalances = {
  byId: PortfolioBalancesById
  // all asset ids in an account
  ids: AssetId[]
}

export type PortfolioAssets = {
  [k: AssetId]: Asset
}

export type PortfolioAccountBalancesById = {
  [k: AccountId]: {
    // these are granular balances of this asset for this account
    [k: AssetId]: string // balance for asset in base units
  }
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

export type Portfolio = {
  accountMetadata: PortfolioAccountMetadata
  accounts: PortfolioAccounts
  assetBalances: PortfolioAssetBalances
  accountBalances: PortfolioAccountBalances
}

export const initialState: Portfolio = {
  accounts: {
    byId: {},
    ids: [],
  },
  assetBalances: {
    byId: {},
    ids: [],
  },
  // requested account ids and associated metadata from when the wallet is connected
  accountMetadata: {
    byId: {},
    ids: [],
  },
  accountBalances: {
    byId: {},
    ids: [],
  },
}
