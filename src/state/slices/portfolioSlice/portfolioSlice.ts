import { createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP2, caip2, CAIP10, caip10, CAIP19 } from '@shapeshiftoss/caip'
import { Asset, chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { mergeWith } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import toLower from 'lodash/toLower'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { AccountSpecifierMap } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketData } from 'state/slices/marketDataSlice/marketDataSlice'

// We should prob change this once we add more chains
const feeAssetIds = ['eip155:1/slip44:60', 'bip122:000000000019d6689c085ae165831e93/slip44:0']

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
export type PortfolioAccounts = {
  byId: {
    // asset ids belonging to an account
    [k: AccountSpecifier]: CAIP19[]
  }
  // a list of accounts in this portfolio
  ids: AccountSpecifier[]
}

export type PortfolioBalancesById = {
  // these are aggregated balances across all accounts in a portfolio for the same asset
  // balance in base units of asset - bn doesn't serialize
  [k: CAIP19]: string
}

export type PortfolioAssetBalances = {
  byId: PortfolioBalancesById
  // all asset ids in an account
  ids: CAIP19[]
}

// const ethAccountSpecifier: string = eip155:1:0xdef1...cafe
// const btcAccountSpecifier: string = 'bip122:000000000019d6689c085ae165831e93:xpub...'
export type AccountSpecifier = string

export type PortfolioAccountBalances = {
  byId: {
    [k: AccountSpecifier]: {
      // these are granular balances of this asset for this account
      [k: CAIP19]: string // balance for asset in base units
    }
  }
  ids: AccountSpecifier[]
}

export type PortfolioAccountSpecifiers = {
  byId: {
    // this maps an account identifier to a list of addresses
    // in the case of utxo chains, an account (e.g. xpub/ypub/zpub) can have multiple addresses
    // in account based chains, this is a 1:1 mapping, i.e. the account is the address
    [k: AccountSpecifier]: CAIP10[]
  }
  ids: AccountSpecifier[]
}

export type Portfolio = {
  accountSpecifiers: PortfolioAccountSpecifiers
  accounts: PortfolioAccounts
  assetBalances: PortfolioAssetBalances
  accountBalances: PortfolioAccountBalances
}

const initialState: Portfolio = {
  accounts: {
    byId: {},
    ids: []
  },
  assetBalances: {
    byId: {},
    ids: []
  },
  accountSpecifiers: {
    byId: {},
    ids: []
  },
  accountBalances: {
    byId: {},
    ids: []
  }
}

// for assetBalances, they're aggregated across all accounts, so we need to
// upsert and sum the balances by id
// https://lodash.com/docs/4.17.15#mergeWith
const upsertAndSum = (dest: string, src: string) => {
  // if we have an existing balance for this asset, add to it
  if (dest) return bnOrZero(dest).plus(bnOrZero(src)).toString()
  // returning undefined uses default merge function, i.e. upsert
}

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    clearPortfolio: () => initialState,
    upsertPortfolio: (state, { payload }: { payload: Portfolio }) => {
      // upsert all
      state.accounts.byId = { ...state.accounts.byId, ...payload.accounts.byId }
      const accountIds = Array.from(new Set([...state.accounts.ids, ...payload.accounts.ids]))
      state.accounts.ids = accountIds

      state.assetBalances.byId = mergeWith(
        state.assetBalances.byId,
        payload.assetBalances.byId,
        upsertAndSum
      )

      state.accountBalances.byId = {
        ...state.accountBalances.byId,
        ...payload.accountBalances.byId
      }
      state.accountSpecifiers.byId = {
        ...state.accountSpecifiers.byId,
        ...payload.accountSpecifiers.byId
      }
      const assetBalanceIds = Array.from(
        new Set([...state.assetBalances.ids, ...payload.assetBalances.ids])
      )
      const accountBalanceIds = Array.from(
        new Set([...state.accountBalances.ids, ...payload.accountBalances.ids])
      )
      const accountSpecifiers = Array.from(
        new Set([...state.accountSpecifiers.ids, ...payload.accountSpecifiers.ids])
      )
      state.assetBalances.ids = assetBalanceIds
      state.accountBalances.ids = accountBalanceIds
      state.accountSpecifiers.ids = accountSpecifiers
    }
  }
})

type AccountToPortfolioArgs = {
  [k: CAIP10]: chainAdapters.Account<ChainTypes>
}

type AccountToPortfolio = (args: AccountToPortfolioArgs) => Portfolio

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountToPortfolio: AccountToPortfolio = args => {
  const portfolio: Portfolio = cloneDeep(initialState)

  Object.entries(args).forEach(([_xpubOrAccount, account]) => {
    const { chain } = account

    switch (chain) {
      case ChainTypes.Ethereum: {
        const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
        const { caip2, caip19, pubkey } = account
        const accountSpecifier = `${caip2}:${toLower(pubkey)}`
        const CAIP10 = caip10.toCAIP10({ caip2, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        portfolio.accounts.byId[accountSpecifier] = []
        portfolio.accounts.byId[accountSpecifier].push(caip19)
        portfolio.accounts.ids.push(accountSpecifier)

        portfolio.assetBalances.byId[caip19] = ethAccount.balance
        portfolio.assetBalances.ids.push(caip19)

        portfolio.accountBalances.byId[accountSpecifier] = {
          [caip19]: ethAccount.balance
        }

        portfolio.accountSpecifiers.byId[accountSpecifier] = [CAIP10]

        ethAccount.chainSpecific.tokens?.forEach(token => {
          portfolio.accounts.byId[CAIP10].push(token.caip19)
          portfolio.assetBalances.ids.push(token.caip19)
          portfolio.assetBalances.byId[token.caip19] = token.balance

          portfolio.accountBalances.byId[accountSpecifier] = {
            ...portfolio.accountBalances.byId[accountSpecifier],
            [token.caip19]: token.balance
          }
        })
        break
      }
      case ChainTypes.Bitcoin: {
        const btcAccount = account as chainAdapters.Account<ChainTypes.Bitcoin>
        const { balance, caip2, caip19, pubkey } = account
        // Since btc the pubkeys (address) are base58Check encoded, we don't want to lowercase them and put them in state
        const accountSpecifier = `${caip2}:${pubkey}`
        const addresses = btcAccount.chainSpecific.addresses ?? []

        portfolio.assetBalances.ids.push(caip19)
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        // initialize this
        portfolio.accountBalances.byId[accountSpecifier] = {}

        // add the balance from the top level of the account
        portfolio.accountBalances.byId[accountSpecifier][caip19] = balance

        // initialize
        if (!portfolio.accounts.byId[accountSpecifier]?.length) {
          portfolio.accounts.byId[accountSpecifier] = []
        }

        portfolio.accounts.ids = Array.from(new Set([...portfolio.accounts.ids, accountSpecifier]))

        portfolio.accounts.byId[accountSpecifier] = Array.from(
          new Set([...portfolio.accounts.byId[accountSpecifier], caip19])
        )

        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, caip19]))

        portfolio.assetBalances.byId[caip19] = bnOrZero(portfolio.assetBalances.byId[caip19])
          .plus(bnOrZero(balance))
          .toString()

        // For tx history, we need to have CAIP10's of addresses that may have 0 balances
        // for accountSpecifier to CAIP10 mapping
        addresses.forEach(({ pubkey }) => {
          const CAIP10 = caip10.toCAIP10({ caip2, account: pubkey })
          if (!portfolio.accountSpecifiers.byId[accountSpecifier]) {
            portfolio.accountSpecifiers.byId[accountSpecifier] = []
          }

          portfolio.accountSpecifiers.byId[accountSpecifier].push(CAIP10)
        })

        break
      }
      default:
        break
    }
  })

  return portfolio
}

export const portfolioApi = createApi({
  reducerPath: 'portfolioApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getAccount: build.query<Portfolio, AccountSpecifierMap>({
      queryFn: async accountSpecifiers => {
        if (isEmpty(accountSpecifiers)) return { data: cloneDeep(initialState) }
        const chainAdapters = getChainAdapters()
        const [CAIP2, accountSpecifier] = Object.entries(accountSpecifiers)[0] as [CAIP2, string]
        // TODO(0xdef1cafe): chainAdapters.byCAIP2()
        const { chain } = caip2.fromCAIP2(CAIP2)
        try {
          const chainAdaptersAccount = await chainAdapters
            .byChain(chain)
            .getAccount(accountSpecifier)
          const account = { [accountSpecifier]: chainAdaptersAccount }
          const data = accountToPortfolio(account)
          return { data }
        } catch (e) {
          const status = 400
          const data = JSON.stringify(e)
          const error = { status, data }
          return { error }
        }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        await cacheDataLoaded
        const port = getCacheEntry().data
        if (!port) return
        dispatch(portfolio.actions.upsertPortfolio(port))
      }
    })
  })
})

export const selectPortfolioAssetIds = (state: ReduxState): PortfolioAssetBalances['ids'] =>
  state.portfolio.assetBalances.ids
export const selectPortfolioAssetBalances = (state: ReduxState): PortfolioAssetBalances['byId'] =>
  state.portfolio.assetBalances.byId
export const selectAccountIds = (state: ReduxState): PortfolioAccountSpecifiers['byId'] =>
  state.portfolio.accountSpecifiers.byId
export const selectPortfolioAccountBalances = (
  state: ReduxState
): PortfolioAccountBalances['byId'] => state.portfolio.accountBalances.byId

export const selectPortfolioFiatBalances = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  (assetsById, marketData, balances) =>
    Object.entries(balances).reduce<PortfolioAssetBalances['byId']>(
      (acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price)).toFixed(2)
        acc[assetId] = assetFiatBalance
        return acc
      },
      {}
    )
)

type ParamFilter = {
  assetId?: CAIP19
  accountId?: AccountSpecifier
}

const selectAssetIdParam = (_state: ReduxState, id: CAIP19) => id
const selectAssetIdParamFromFilter = (_state: ReduxState, paramFilter: ParamFilter = {}) =>
  paramFilter.assetId
const selectAccountIdParamFromFilter = (_state: ReduxState, paramFilter: ParamFilter = {}) =>
  paramFilter.accountId
const selectAccountAddressParam = (_state: ReduxState, id: CAIP10) => id
const selectAccountIdParam = (_state: ReduxState, id: AccountSpecifier) => id

export const selectPortfolioFiatAccountBalances = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectMarketData,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [caip19, cryptoBalance]) => {
            const precision = assetsById[caip19]?.precision
            const price = marketData[caip19]?.price
            const cryptoValue = fromBaseUnit(cryptoBalance, precision)
            const fiatbalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[caip19] = fiatbalance

            return acc
          },
          { ...balanceObj }
        )

        return acc
      },
      { ...accounts }
    )
  }
)

export const selectPortfolioTotalFiatBalance = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string =>
    Object.values(portfolioFiatBalances)
      .reduce((acc, assetFiatBalance) => acc.plus(bnOrZero(assetFiatBalance)), bn(0))
      .toFixed(2)
)

export const selectPortfolioFiatBalanceByAssetId = createSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParam,
  (portfolioFiatBalances, assetId) => portfolioFiatBalances[assetId]
)

export const selectPortfolioFiatBalancesByFilter = createSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatAccountBalances,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  (portfolioAssetFiatBalances, portfolioAccountFiatbalances, assetId, accountId) => {
    if (assetId && !accountId) return portfolioAssetFiatBalances[assetId]
    if (assetId && accountId) return portfolioAccountFiatbalances[accountId][assetId]
    if (!assetId && accountId) {
      const accountBalances = portfolioAccountFiatbalances[accountId]
      const totalAccountBalances = Object.values(accountBalances).reduce(
        (totalBalance: string, fiatBalance: string) => {
          return bnOrZero(totalBalance).plus(fiatBalance).toFixed(2)
        },
        '0'
      )
      return totalAccountBalances
    }
    return '0'
  }
)

export const selectPortfolioCryptoBalanceByAssetId = createSelector(
  selectPortfolioAssetBalances,
  selectAssetIdParam,
  (byId, assetId): string => byId[assetId]
)

export const selectPortfolioCryptoHumanBalanceByAssetId = createSelector(
  selectAssets,
  selectPortfolioAssetBalances,
  selectAssetIdParam,
  (assets, balances, assetId): string =>
    fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0)
)

// TODO(0xdef1cafe): this selector is a hack and needs to be deleted once the account pages are done
// do not use it or i'll hurt you
export const selectPortfolioCryptoHumanBalanceByAccountTypeAndAssetId = createSelector(
  selectAssets,
  selectPortfolioAssetBalances,
  selectPortfolioAccountBalances,
  selectAssetIdParam,
  (_state: ReduxState, _assetId: string, accountType: UtxoAccountType | undefined) => accountType,
  (assets, balances, accountBalances, assetId, accountType): string => {
    if (!accountType) {
      // in the case of eth, this was working ok, and we only support a single account at the moment,
      // so we can use the portfolio balance
      // TODO(0xdef1cafe): we need to fix this to use the accountId and the assetId when we're implementing
      // account pages - this will break once we support more than accountIndex 0 for account based chains
      return fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0)
    } else {
      const accountTypeToPubMap = {
        [UtxoAccountType.P2pkh]: 'xpub', // legacy
        [UtxoAccountType.SegwitP2sh]: 'ypub', // segwit
        [UtxoAccountType.SegwitNative]: 'zpub' // segwit native
      }
      const searchString = accountTypeToPubMap[accountType]
      const accountId = Object.keys(accountBalances).find(key => {
        // only find bitcoin accounts
        return key.startsWith(assets[assetId].caip2) && key.includes(`:${searchString}`)
      })!
      return fromBaseUnit(
        bnOrZero(accountBalances[accountId]?.[assetId]),
        assets[assetId]?.precision ?? 0
      )
    }
  }
)

export const selectPortfolioFiatBalanceByAccountTypeAndAssetId = createSelector(
  selectPortfolioCryptoHumanBalanceByAccountTypeAndAssetId,
  selectMarketData,
  selectAssetIdParam,
  (accountCryptoHumanBalance, marketData, assetId): string =>
    bnOrZero(accountCryptoHumanBalance).times(bnOrZero(marketData[assetId]?.price)).toFixed(2)
)

export type PortfolioAssets = {
  [k: CAIP19]: Asset
}

export const selectPortfolioAssets = createSelector(
  selectAssets,
  selectPortfolioAssetIds,
  (assetsById, portfolioAssetIds): { [k: CAIP19]: Asset } =>
    portfolioAssetIds.reduce<PortfolioAssets>((acc, cur) => {
      acc[cur] = assetsById[cur]
      return acc
    }, {})
)

export const selectPortfolioAccountIds = (state: ReduxState): CAIP19[] =>
  state.portfolio.accounts.ids

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectPortfolioLoading = createSelector(
  selectPortfolioAccountIds,
  (ids): boolean => !Boolean(ids.length)
)

export const selectPortfolioAssetBalancesSortedFiat = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): { [k: CAIP19]: string } =>
    Object.entries(portfolioFiatBalances)
      .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
      .reduce<PortfolioAssetBalances['byId']>((acc, [assetId, assetFiatBalance]) => {
        acc[assetId] = assetFiatBalance
        return acc
      }, {})
)

export const selectPortfolioAssetIdsSortedFiat = createSelector(
  selectPortfolioAssetBalancesSortedFiat,
  (sortedBalances): CAIP19[] => Object.keys(sortedBalances)
)

export const selectPortfolioAllocationPercent = createSelector(
  selectPortfolioTotalFiatBalance,
  selectPortfolioFiatBalances,
  (totalBalance, fiatBalances): { [k: CAIP19]: number } =>
    Object.entries(fiatBalances).reduce<{ [k: CAIP19]: number }>((acc, [assetId, fiatBalance]) => {
      acc[assetId] = bnOrZero(fiatBalance).div(bnOrZero(totalBalance)).times(100).toNumber()
      return acc
    }, {})
)

export const selectPortfolioIsEmpty = createSelector(
  selectPortfolioAssetIds,
  (assetIds): boolean => !assetIds.length
)

export const selectPortfolioAccounts = (state: ReduxState) => state.portfolio.accounts.byId

export const selectPortfolioAssetAccounts = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, assetId: CAIP19) => assetId,
  (portfolioAccounts, assetId): AccountSpecifier[] =>
    Object.keys(portfolioAccounts).filter(accountSpecifier =>
      portfolioAccounts[accountSpecifier].find(accountAssetId => accountAssetId === assetId)
    )
)

export const selectPortfolioAccountById = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, accountId: AccountSpecifier) => accountId,
  (portfolioAccounts, accountId) => portfolioAccounts[accountId]
)

export const selectPortfolioAssetIdsByAccountId = createSelector(
  selectPortfolioAccountBalances,
  selectAccountIdParam,
  (accounts, accountId) => Object.keys(accounts[accountId])
)

export const selectPortfolioAssetIdsByAccountIdExcludeFeeAsset = createSelector(
  selectAssets,
  selectPortfolioAssetIdsByAccountId,
  (assets, assetIds) =>
    assetIds.filter(assetId => !feeAssetIds.includes(assetId) && assets[assetId])
)

export const selectAccountIdByAddress = createSelector(
  selectAccountIds,
  selectAccountAddressParam,
  (portfolioAccounts: { [k: AccountSpecifier]: CAIP10[] }, caip10): string => {
    let accountSpecifier = ''
    for (const accountId in portfolioAccounts) {
      const isAccountSpecifier = !!portfolioAccounts[accountId].find(
        acctCaip10 => toLower(acctCaip10) === toLower(caip10)
      )
      if (isAccountSpecifier) {
        accountSpecifier = accountId
        break
      }
    }
    return accountSpecifier
  }
)

export const selectFeeAssetIdByAccountId = (accountId: AccountSpecifier) => {
  // accountId = 'eip155:1:0xdef1...cafe
  const [chain, network] = accountId.split(':')
  const caip2 = `${chain}:${network}`
  // we only need to update this function when we support additional chains, which is infrequent
  // so it's ok to hardcode this map here
  const caip2toCaip19: Record<string, string> = {
    'eip155:1': 'eip155:1/slip44:60',
    'bip122:000000000019d6689c085ae165831e93': 'bip122:000000000019d6689c085ae165831e93/slip44:0'
  }

  return caip2toCaip19[caip2]
}

export const selectAccountIdsByAssetId = createSelector(
  selectPortfolioAccounts,
  selectAssetIdParam,
  (portfolioAccounts, assetId): AccountSpecifier[] => {
    const result = Object.entries(portfolioAccounts).reduce<AccountSpecifier[]>(
      (acc, [accountId, accountAssets]) => {
        if (accountAssets.includes(assetId)) acc.push(accountId)
        return acc
      },
      []
    )
    return result
  }
)
