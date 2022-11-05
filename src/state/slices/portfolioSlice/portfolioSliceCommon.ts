import type { Asset } from '@keepkey/asset-service'
import type { AccountId, AssetId } from '@keepkey/caip'
import type { cosmossdk } from '@keepkey/chain-adapters'
import type { BIP44Params, UtxoAccountType } from '@keepkey/types'

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
export type AccountSpecifier = string
export type Staking = {
  delegations: cosmossdk.Delegation[]
  redelegations: cosmossdk.Redelegation[]
  undelegations: cosmossdk.UndelegationEntry[]
  rewards: cosmossdk.Reward[]
}

type StakingDataParsedByAccountSpecifier = Record<AccountSpecifier, Staking>
export type StakingDataByValidatorId = Record<PubKey, StakingDataParsedByAccountSpecifier>

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

export type PortfolioAccountBalancesById = {
  [k: AccountSpecifier]: {
    // these are granular balances of this asset for this account
    [k: AssetId]: string // balance for asset in base units
  }
}

export type PortfolioAccountBalances = {
  byId: PortfolioAccountBalancesById
  ids: AccountSpecifier[]
}

export type AccountMetadata = {
  bip44Params: BIP44Params
  accountType?: UtxoAccountType
}

export type AccountMetadataById = {
  [k: AccountId]: AccountMetadata
}

/**
 * important note about this type
 *
 * for EVM and CosmosSDK-based chains, the address is the same as the account
 * for UTXO based chains, the account is an xpub or variety thereof, and addresses
 * belong to accounts.
 *
 * in the future we will refer to accounts on all varieties of chains as a Pubkey
 *
 * w.r.t this type, for
 * * Bitcoin Legacy this is a 1-prefixed address
 * * Bitcoin Segwit this is a 3-prefixed address
 * * Bitcoin Segwit Native this is a bc1-prefixed address
 *
 * as soon as we change websocket subscription logic, this entire byId section
 * can be removed from the store, as the only reason we currently maintain this mapping
 * is to be able to lookup an account from an address for websocket messages for UTXO chains
 */
type Address = string

export type PortfolioAccountSpecifiers = {
  accountMetadataById: AccountMetadataById
  byId: {
    // this maps an account identifier to a list of addresses
    // in the case of utxo chains, an account (e.g. xpub/ypub/zpub) can have multiple addresses
    // in account based chains, this is a 1:1 mapping, i.e. the account is the address
    [k: AccountSpecifier]: Address[]
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
    accountMetadataById: {},
    byId: {},
    ids: [],
  },
  accountBalances: {
    byId: {},
    ids: [],
  },
}
