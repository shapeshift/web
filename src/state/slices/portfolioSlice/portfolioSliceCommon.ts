import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'

import type { PubKey } from '../validatorDataSlice/validatorDataSlice'

/*
 * we can't retrieve an xpub from an address, but we can derive
 * addresses from xpubs
 * address have sats balances, but we want to display balances aggregated
 * by accountType, so we need a mapping from xpub to a list of addresses
 *
 * in the case of account based chains, e.g. eth, this will be a 1:1
 * mapping as the accountSpecifier (0x address) is the same as the address
 * holding assets with balances
 *
 * this satisfies our requirements of being able to aggregate balances
 * over an entire asset, e.g. show me all the eth i have across all my accounts
 * and also show me all the bitcoin i have across all different accountTypes
 * and addresses, and also preempts supporting more than accountIndex 0 in future
 */

// const ethAccountSpecifier: string = eip155:1:0xdef1...cafe
// const btcAccountSpecifier: string = 'bip122:000000000019d6689c085ae165831e93:xpub...'
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
