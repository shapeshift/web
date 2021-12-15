import { createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { caip2, CAIP10, caip10, CAIP19 } from '@shapeshiftoss/caip'
import { Asset, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { Pubkeys } from 'hooks/usePubkeys/usePubkeys'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectAssetsById } from 'state/slices/assetsSlice/assetsSlice'
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
  accounts: {
    byId: {},
    ids: []
  },
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
    setPortfolio: (_state, { payload }: { payload: Portfolio }) => payload
  }
})

type AccountsToPortfolioArgs = {
  [k: CAIP10]: chainAdapters.Account<ChainTypes>
}

type AccountsToPortfolio = (args: AccountsToPortfolioArgs) => Portfolio

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountsToPortfolio: AccountsToPortfolio = args => {
  const portfolio: Portfolio = cloneDeep(initialState)

  Object.entries(args).forEach(([CAIP10, account]) => {
    const { chain } = account
    portfolio.accounts.byId[CAIP10] = []
    portfolio.accounts.ids.push(CAIP10)
    switch (chain) {
      case ChainTypes.Ethereum: {
        const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
        portfolio.accounts.byId[CAIP10].push(account.caip19)
        portfolio.balances.ids.push(account.caip19)
        portfolio.balances.byId[account.caip19] = ethAccount.balance
        ethAccount.chainSpecific.tokens?.forEach(token => {
          portfolio.accounts.byId[CAIP10].push(token.caip19)
          portfolio.balances.ids.push(token.caip19)
          portfolio.balances.byId[token.caip19] = token.balance
        })
        break
      }
      case ChainTypes.Bitcoin: {
        const btcAccount = account as chainAdapters.Account<ChainTypes.Bitcoin>
        const addresses = btcAccount.chainSpecific.addresses ?? []
        // TODO(0xdef1cafe): is there only one with a balance here...?
        const totalSats = addresses.reduce((acc, cur) => acc.plus(bnOrZero(cur.balance)), bn(0))
        const balance = totalSats.decimalPlaces(0).toString()

        // this will index accounts by xpub/ypub/zpub
        // with a combined balance of all sats in all addresses owned by that xpub
        portfolio.accounts.byId[CAIP10].push(account.caip19)
        portfolio.balances.byId[account.caip19] = balance
        portfolio.balances.ids.push(account.caip19)

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
    // TODO(0xdef1cafe): make this take a single account and dispatch multiple actions
    getAccounts: build.query<AccountsToPortfolioArgs, Pubkeys>({
      queryFn: async pubkeys => {
        // can't call hooks conditionally, this is a valid return
        if (isEmpty(pubkeys)) return { data: {} }

        const chainAdapters = getChainAdapters()

        // fetch accounts for each chain
        const promises = Object.entries(pubkeys).map(async ([CAIP2, pubkey]) => {
          // TODO(0xdef1cafe): chainAdapters.byCAIP2()
          const { chain } = caip2.fromCAIP2(CAIP2)
          return chainAdapters.byChain(chain).getAccount(pubkey)
        })

        // allow failures of individual chains
        const maybeAccounts = await Promise.allSettled(promises)

        const data = maybeAccounts.reduce<AccountsToPortfolioArgs>((acc, cur) => {
          if (cur.status === 'rejected') {
            // TODO(0xdef1cafe): handle error - this can't return both
            console.error(`portfolioApi: ${cur.reason}`)
          } else if (cur.status === 'fulfilled') {
            const CAIP10 = caip10.toCAIP10({ caip2: cur.value.caip2, account: cur.value.pubkey })
            acc[CAIP10] = cur.value
          }
          return acc
        }, {})
        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        // we don't really have a 1:1 mapping between the chain adapters
        // response, and how we want to structure the data in the store
        // let RTK query managing the api bits, and we'll structure the data
        // how we want it in the portfolio

        await cacheDataLoaded

        const account = getCacheEntry().data
        if (!account) return

        dispatch(portfolio.actions.setPortfolio(accountsToPortfolio(account)))
      }
    })
  })
})

export const { useGetAccountsQuery } = portfolioApi

export const selectPortfolioAssetIds = (state: ReduxState): PortfolioBalances['ids'] =>
  state.portfolio.balances.ids
export const selectPortfolioBalances = (state: ReduxState): PortfolioBalances['byId'] =>
  state.portfolio.balances.byId

export const selectPortfolioFiatBalances = createSelector(
  selectAssetsById,
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
  selectAssetsById,
  selectPortfolioBalances,
  selectAssetIdParam,
  (assets, balances, assetId): string =>
    fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0)
)

export type PortfolioAssets = {
  [k: CAIP19]: Asset
}

export const selectPortfolioAssets = createSelector(
  selectAssetsById,
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
