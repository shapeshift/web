import { createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP2, caip2, CAIP10, caip10, CAIP19 } from '@shapeshiftoss/caip'
import { Asset, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { AccountSpecifier } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketData } from 'state/slices/marketDataSlice/marketDataSlice'

export type PortfolioAccounts = {
  byId: {
    // asset ids belonging to an account
    [k: CAIP10]: CAIP19[]
  }
  // a list of accounts in this portfolio
  ids: CAIP10[]
}

export type PortfolioBalances = {
  byId: {
    // balance in base units of asset - bn doesn't serialize
    [k: CAIP19]: string
  }
  // all asset ids in an account
  ids: CAIP19[]
}

export type Portfolio = {
  accounts: PortfolioAccounts
  balances: PortfolioBalances
}

const initialState: Portfolio = {
  // TODO(0xdef1cafe): add accountSpecifier to account mapping here
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
  accounts: {
    byId: {},
    ids: []
  },
  // TODO(0xdef1cafe): add accountAsset mapping here
  balances: {
    byId: {},
    ids: []
  }
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
      state.balances.byId = { ...state.balances.byId, ...payload.balances.byId }
      const balanceIds = Array.from(new Set([...state.balances.ids, ...payload.balances.ids]))
      state.balances.ids = balanceIds
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
        const { caip2, caip19 } = account
        const CAIP10 = caip10.toCAIP10({ caip2, account: _xpubOrAccount })

        portfolio.accounts.byId[CAIP10] = []
        portfolio.accounts.byId[CAIP10].push(caip19)
        portfolio.accounts.ids.push(CAIP10)

        portfolio.balances.byId[caip19] = ethAccount.balance
        portfolio.balances.ids.push(caip19)

        ethAccount.chainSpecific.tokens?.forEach(token => {
          portfolio.accounts.byId[CAIP10].push(token.caip19)
          portfolio.balances.ids.push(token.caip19)
          portfolio.balances.byId[token.caip19] = token.balance
        })
        break
      }
      case ChainTypes.Bitcoin: {
        const btcAccount = account as chainAdapters.Account<ChainTypes.Bitcoin>
        const { caip2, caip19 } = account
        const addresses = btcAccount.chainSpecific.addresses ?? []
        if (addresses.length) portfolio.balances.ids.push(caip19)
        addresses.forEach(({ pubkey, balance }) => {
          if (bnOrZero(balance).eq(0)) return
          const CAIP10 = caip10.toCAIP10({ caip2, account: pubkey })
          if (!portfolio.accounts.byId[CAIP10]?.length) {
            portfolio.accounts.byId[CAIP10] = []
          }
          portfolio.accounts.byId[CAIP10].push(caip19)
          portfolio.accounts.ids.push(CAIP10)

          portfolio.balances.byId[caip19] = bnOrZero(portfolio.balances.byId[caip19])
            .plus(bnOrZero(balance))
            .toString()
          if (!portfolio.balances.ids.includes(caip19)) portfolio.balances.ids.push(caip19)
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
    getAccount: build.query<Portfolio, AccountSpecifier>({
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

export const selectPortfolioAssetIds = (state: ReduxState): PortfolioBalances['ids'] =>
  state.portfolio.balances.ids
export const selectPortfolioBalances = (state: ReduxState): PortfolioBalances['byId'] =>
  state.portfolio.balances.byId

export const selectPortfolioFiatBalances = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioBalances,
  (assetsById, marketData, balances) =>
    Object.entries(balances).reduce<PortfolioBalances['byId']>(
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

export const selectPortfolioTotalFiatBalance = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string =>
    Object.values(portfolioFiatBalances)
      .reduce((acc, assetFiatBalance) => acc.plus(bnOrZero(assetFiatBalance)), bn(0))
      .toFixed(2)
)

const selectAssetIdParam = (_state: ReduxState, id: CAIP19) => id

export const selectPortfolioFiatBalanceById = createSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParam,
  (portfolioFiatBalances, assetId) => portfolioFiatBalances[assetId]
)

export const selectPortfolioCryptoBalanceById = createSelector(
  selectPortfolioBalances,
  selectAssetIdParam,
  (byId, assetId): string => byId[assetId]
)

export const selectPortfolioCryptoHumanBalanceById = createSelector(
  selectAssets,
  selectPortfolioBalances,
  selectAssetIdParam,
  (assets, balances, assetId): string =>
    fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0)
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
      .reduce<PortfolioBalances['byId']>((acc, [assetId, assetFiatBalance]) => {
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
