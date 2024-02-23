import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId, type AssetId, fromAccountId, isNft } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountIdParamFromFilter, selectAssetIdParamFromFilter } from 'state/selectors'

import { selectFungibleAssets } from './assetsSlice/selectors'
import { selectMarketDataUserCurrency } from './marketDataSlice/selectors'
import type { PortfolioAccountBalancesById } from './portfolioSlice/portfolioSliceCommon'
import { selectBalanceThreshold } from './preferencesSlice/selectors'

export const selectWalletId = (state: ReduxState) => state.portfolio.connectedWallet?.id
export const selectWalletName = (state: ReduxState) => state.portfolio.connectedWallet?.name
export const selectIsWalletConnected = (state: ReduxState) =>
  state.portfolio.connectedWallet !== undefined
export const selectWalletSupportedChainIds = (state: ReduxState) =>
  state.portfolio.connectedWallet?.supportedChainIds ?? []

export const selectWalletAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  (state: ReduxState) => state.portfolio.wallet.byId,
  (walletId, walletById): AccountId[] => (walletId && walletById[walletId]) ?? [],
)

export const selectWalletChainIds = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  accountIds => {
    const chainIds = accountIds.reduce<ChainId[]>((acc, accountId) => {
      const { chainId } = fromAccountId(accountId)
      if (!acc.includes(chainId)) acc.push(chainId)
      return acc
    }, [])
    return chainIds
  },
)

export const selectPortfolioAccountBalancesBaseUnit = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  (state: ReduxState): PortfolioAccountBalancesById => state.portfolio.accountBalances.byId,
  (walletAccountIds, accountBalancesById) =>
    pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    ),
)

export const selectPortfolioAssetBalancesBaseUnit = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
  (accountBalancesById): Record<AssetId, string> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAssetId) => {
      Object.entries(byAssetId).forEach(([assetId, balance]) => {
        const bnBalance = bnOrZero(balance)

        // don't include assets with zero crypto balance
        if (bnBalance.isZero()) {
          return
        }

        acc[assetId] = bnOrZero(acc[assetId]).plus(bnBalance).toFixed()
      })
      return acc
    }, {}),
)

export const selectPortfolioCryptoBalanceBaseUnitByFilter = createCachedSelector(
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) return accountBalances?.[accountId]?.[assetId] ?? '0'
    return assetId ? assetBalances[assetId] : '0'
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioCryptoPrecisionBalanceByFilter = createCachedSelector(
  selectFungibleAssets,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string => {
    if (!assetId) return '0'
    const precision = assets?.[assetId]?.precision
    // to avoid megabillion phantom balances in mixpanel, return 0 rather than base unit value
    // if we don't have a precision for the asset
    if (precision === undefined) return '0'
    if (accountId) return fromBaseUnit(bnOrZero(accountBalances?.[accountId]?.[assetId]), precision)
    return fromBaseUnit(bnOrZero(assetBalances[assetId]), precision)
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioUserCurrencyBalances = createDeepEqualOutputSelector(
  selectFungibleAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalancesBaseUnit,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
      const asset = assetsById[assetId]
      if (!asset) return acc
      const precision = asset.precision
      if (precision === undefined) return acc
      const price = marketData[assetId]?.price
      const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
      const assetUserCurrencyBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
      if (assetUserCurrencyBalance.lt(bnOrZero(balanceThreshold))) return acc
      acc[assetId] = assetUserCurrencyBalance.toFixed(2)
      return acc
    }, {}),
)

export const selectPortfolioUserCurrencyBalancesByAccountId = createDeepEqualOutputSelector(
  selectFungibleAssets,
  selectPortfolioAccountBalancesBaseUnit,
  selectMarketDataUserCurrency,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [assetId, cryptoBalance]) => {
            const asset = assetsById[assetId]
            if (!asset) return acc
            const precision = asset.precision
            const price = marketData[assetId]?.price ?? 0
            const cryptoValue = fromBaseUnit(bnOrZero(cryptoBalance), precision)
            const userCurrencyBalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[assetId] = userCurrencyBalance

            return acc
          },
          { ...balanceObj },
        )

        return acc
      },
      { ...accounts },
    )
  },
)

export const selectPortfolioFungibleAssetsSortedByBalance = createDeepEqualOutputSelector(
  selectPortfolioUserCurrencyBalances,
  selectFungibleAssets,
  (portfolioUserCurrencyBalances, fungibleAssets) => {
    const getAssetBalance = ([_assetId, balance]: [AssetId, string]) => bnOrZero(balance).toNumber()

    return orderBy<[AssetId, string][]>(
      Object.entries(portfolioUserCurrencyBalances),
      [getAssetBalance],
      ['desc'],
    )
      .map(value => {
        const assetId = (value as [AssetId, string])[0]
        return fungibleAssets[assetId]
      })
      .filter(isSome)
      .filter(asset => !isNft(asset.assetId))
  },
)
