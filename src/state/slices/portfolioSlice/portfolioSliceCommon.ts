import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { cosmos } from '@shapeshiftoss/chain-adapters'
import { Asset } from '@shapeshiftoss/types'

import { PubKey } from '../validatorDataSlice/validatorDataSlice'

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
export type AccountSpecifier = string

export type Staking = {
  delegations: cosmos.Delegation[]
  redelegations: cosmos.Redelegation[]
  undelegations: cosmos.UndelegationEntry[]
  rewards: cosmos.Reward[]
}

export type PortfolioAccount = {
  /** The asset ids belonging to an account */
  assetIds: AssetId[]
  /** The list of validators this account is delegated to */
  validatorIds?: PubKey[]
  /** The staking data for per validator, so we can do a join from validatorDataSlice */
  stakingDataByValidatorId?: Record<PubKey, StakingDataParsedByAccountSpecifier>
}
type StakingDataParsedByAccountSpecifier = Record<string, Staking>

export type PortfolioAccounts = {
  byId: {
    [k: AccountSpecifier]: PortfolioAccount
  }
  // a list of accounts in this portfolio
  ids: AccountSpecifier[]
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

export type PortfolioAccountBalances = {
  byId: {
    [k: AccountSpecifier]: {
      // these are granular balances of this asset for this account
      [k: AssetId]: string // balance for asset in base units
    }
  }
  ids: AccountSpecifier[]
}

export type PortfolioAccountSpecifiers = {
  byId: {
    // this maps an account identifier to a list of addresses
    // in the case of utxo chains, an account (e.g. xpub/ypub/zpub) can have multiple addresses
    // in account based chains, this is a 1:1 mapping, i.e. the account is the address
    [k: AccountSpecifier]: AccountId[]
  }
  ids: AccountSpecifier[]
}

export type Portfolio = {
  accountSpecifiers: PortfolioAccountSpecifiers
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
  accountSpecifiers: {
    byId: {},
    ids: [],
  },
  accountBalances: {
    byId: {},
    ids: [],
  },
}
