import { createSelector } from '@reduxjs/toolkit'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
  osmosisAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import { maxBy } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import difference from 'lodash/difference'
import entries from 'lodash/entries'
import flow from 'lodash/flow'
import head from 'lodash/head'
import keys from 'lodash/keys'
import map from 'lodash/map'
import reduce from 'lodash/reduce'
import size from 'lodash/size'
import sum from 'lodash/sum'
import toLower from 'lodash/toLower'
import toNumber from 'lodash/toNumber'
import uniq from 'lodash/uniq'
import values from 'lodash/values'
import { createCachedSelector } from 're-reselect'
import type { BridgeAsset } from 'components/Bridge/types'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import {
  selectFarmContractsFiatBalance,
  selectLpPlusFarmContractsBaseUnitBalance,
} from 'state/slices/foxEthSlice/selectors'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectBalanceThreshold } from 'state/slices/preferencesSlice/selectors'

import type { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { foxEthLpAssetId } from '../foxEthSlice/constants'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from '../validatorDataSlice/constants'
import { selectValidators } from '../validatorDataSlice/selectors'
import {
  getDefaultValidatorAddressFromAccountId,
  getDefaultValidatorAddressFromAssetId,
} from '../validatorDataSlice/utils'
import type { PubKey } from '../validatorDataSlice/validatorDataSlice'
import { selectAccountSpecifiers } from './../accountSpecifiersSlice/selectors'
import type {
  AccountMetadata,
  AccountMetadataById,
  PortfolioAccountBalances,
  PortfolioAccountBalancesById,
  PortfolioAccountSpecifiers,
  PortfolioAssetBalances,
  PortfolioAssets,
  PortfolioBalancesById,
  StakingDataByValidatorId,
} from './portfolioSliceCommon'
import {
  findAccountsByAssetId,
  makeBalancesByChainBucketsFlattened,
  makeSortedAccountBalances,
} from './utils'

type ParamFilter = {
  assetId: AssetId
  accountId: AccountSpecifier
  accountNumber: number
  chainId: ChainId
  accountSpecifier: string
  validatorAddress: PubKey
  supportsCosmosSdk: boolean
}
type OptionalParamFilter = {
  assetId: AssetId
  accountId?: AccountSpecifier
  accountSpecifier?: string
  validatorAddress?: PubKey
  supportsCosmosSdk?: boolean
}
type ParamFilterKey = keyof ParamFilter
type OptionalParamFilterKey = keyof OptionalParamFilter

const selectParamFromFilter =
  <T extends ParamFilterKey>(param: T) =>
  (_state: ReduxState, filter: Pick<ParamFilter, T>): ParamFilter[T] | '' =>
    filter?.[param] ?? ''
const selectParamFromFilterOptional =
  <T extends OptionalParamFilterKey>(param: T) =>
  (_state: ReduxState, filter: Pick<OptionalParamFilter, T>): OptionalParamFilter[T] | '' =>
    filter?.[param] ?? ''

// We should prob change this once we add more chains
const FEE_ASSET_IDS = [
  ethAssetId,
  btcAssetId,
  bchAssetId,
  cosmosAssetId,
  osmosisAssetId,
  thorchainAssetId,
  dogeAssetId,
  ltcAssetId,
  avalancheAssetId,
]

const selectAssetIdParamFromFilter = selectParamFromFilter('assetId')
export const selectChainIdParamFromFilter = selectParamFromFilter('chainId')
const selectAccountIdParamFromFilter = selectParamFromFilter('accountId')
const selectAccountNumberParamFromFilter = selectParamFromFilter('accountNumber')
const selectValidatorAddressParamFromFilter = selectParamFromFilter('validatorAddress')
const selectAccountSpecifierParamFromFilter = selectParamFromFilter('accountSpecifier')

const selectAccountIdParamFromFilterOptional = selectParamFromFilterOptional('accountId')
const selectAssetIdParamFromFilterOptional = selectParamFromFilterOptional('assetId')
const selectSupportsCosmosSdkParamFromFilterOptional =
  selectParamFromFilterOptional('supportsCosmosSdk')

export type OpportunitiesDataFull = {
  totalDelegations: string
  rewards: string
  isLoaded: boolean
  address: string
  moniker: string
  tokens?: string
  apr: string
  commission: string
}

export const selectPortfolioAccounts = (state: ReduxState) => state.portfolio.accounts.byId

export const selectPortfolioAssetIds = createDeepEqualOutputSelector(
  (state: ReduxState): PortfolioAssetBalances['ids'] => state.portfolio.assetBalances.ids,
  ids => ids,
)
export const selectPortfolioAssetBalances = (state: ReduxState): PortfolioAssetBalances['byId'] =>
  state.portfolio.assetBalances.byId
export const selectAccountIds = (state: ReduxState): PortfolioAccountSpecifiers['byId'] =>
  state.portfolio.accountSpecifiers.byId
export const selectPortfolioAccountBalances = (
  state: ReduxState,
): PortfolioAccountBalances['byId'] => state.portfolio.accountBalances.byId

export const selectPortfolioAccountMetadata = createDeepEqualOutputSelector(
  (state: ReduxState): AccountMetadataById => state.portfolio.accountSpecifiers.accountMetadataById,
  accountMetadata => accountMetadata,
)

export const selectPortfolioAccountMetadataByAccountId = createSelector(
  selectPortfolioAccountMetadata,
  selectAccountIdParamFromFilter,
  (accountMetadata, accountId): AccountMetadata => accountMetadata[accountId],
)

export const selectBIP44ParamsByAccountId = createSelector(
  selectPortfolioAccountMetadata,
  selectAccountIdParamFromFilter,
  (accountMetadata, accountId): BIP44Params => accountMetadata[accountId]?.bip44Params,
)

export const selectAccountNumberByAccountId = createSelector(
  selectBIP44ParamsByAccountId,
  (bip44Params): number | undefined => bip44Params?.accountNumber,
)

export const selectAccountTypeByAccountId = createSelector(
  selectPortfolioAccountMetadata,
  selectAccountIdParamFromFilter,
  (accountMetadata, accountId): UtxoAccountType | undefined =>
    accountMetadata[accountId]?.accountType,
)

export const selectIsPortfolioLoaded = createSelector(
  selectAccountSpecifiers,
  selectPortfolioAssetIds,
  (accountSpecifiers, portfolioAssetIds) => {
    if (!accountSpecifiers.length) return false
    /**
     * for a given wallet - we can support 1 to n chains
     * AppContext ensures we will have a portfolioAssetId for each chain's fee asset
     * until the portfolioAssetIds includes supported chains fee assets, it's not fully loaded
     * the golf below ensures that's the case
     */
    const assetIdToChainId = (assetId: AssetId): ChainId => fromAssetId(assetId).chainId

    return !size(
      difference(
        uniq(map(accountSpecifiers, flow([keys, head]))),
        uniq(map(portfolioAssetIds, assetIdToChainId)),
      ),
    )
  },
)

export const selectPortfolioFiatBalances = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<PortfolioAssetBalances['byId']>(
      (acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        acc[assetId] = assetFiatBalance.toFixed(2)
        return acc
      },
      {},
    ),
)

export const selectPortfolioFiatAccountBalances = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectMarketData,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [assetId, cryptoBalance]) => {
            const precision = assetsById[assetId]?.precision
            const price = marketData[assetId]?.price ?? 0
            const cryptoValue = fromBaseUnit(cryptoBalance, precision)
            const fiatBalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[assetId] = fiatBalance

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

export const selectPortfolioTotalFiatBalance = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string =>
    Object.values(portfolioFiatBalances)
      .reduce((acc, assetFiatBalance) => acc.plus(bnOrZero(assetFiatBalance)), bn(0))
      .toFixed(2),
)

export const selectAllStakingDelegationCrypto = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  portfolioAccounts => {
    const allStakingData = Object.entries(portfolioAccounts)
    const allStakingDelegationCrypto = reduce(
      allStakingData,
      (acc, [accountSpecifier, portfolioData]) => {
        if (!portfolioData.stakingDataByValidatorId) return acc
        const delegations = Object.values(portfolioData.stakingDataByValidatorId)
          .flatMap(stakingDataByValidator => Object.values(stakingDataByValidator))
          .flatMap(({ delegations }) => delegations)
        const delegationSum = reduce(
          delegations,
          (acc, delegation) => acc.plus(bnOrZero(delegation.amount)),
          bn(0),
        )
        return { ...acc, [accountSpecifier]: delegationSum }
      },
      {},
    )

    return allStakingDelegationCrypto
  },
)

export const selectAllStakingUndelegationCrypto = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  portfolioAccounts => {
    const allStakingData = Object.entries(portfolioAccounts)
    const allStakingDelegationCrypto = reduce(
      allStakingData,
      (acc, [accountSpecifier, portfolioData]) => {
        if (!portfolioData.stakingDataByValidatorId) return acc
        const undelegations = Object.values(portfolioData.stakingDataByValidatorId)
          .flatMap(stakingDataByValidator => Object.values(stakingDataByValidator))
          .flatMap(({ undelegations }) => undelegations)
        const delegationSum = reduce(
          undelegations,
          (acc, undelegation) => acc.plus(bnOrZero(undelegation.amount)),
          bn(0),
        )
        return { ...acc, [accountSpecifier]: delegationSum }
      },
      {},
    )

    return allStakingDelegationCrypto
  },
)

export const selectTotalStakingDelegationFiat = createDeepEqualOutputSelector(
  selectAllStakingDelegationCrypto,
  selectMarketData,
  (state: ReduxState) => state.assets.byId,
  (allStaked: { [k: string]: string }, marketData, assetsById) => {
    const allStakingData = Object.entries(allStaked)

    const totalStakingDelegationFiat = reduce(
      allStakingData,
      (acc, [accountSpecifier, baseUnitAmount]) => {
        const assetId = accountIdToFeeAssetId(accountSpecifier)
        const price = marketData[assetId]?.price ?? 0
        const amount = fromBaseUnit(baseUnitAmount, assetsById[assetId].precision ?? 0)
        return bnOrZero(amount).times(price).plus(acc)
      },
      bn(0),
    )

    return totalStakingDelegationFiat
  },
)

export const selectTotalStakingUndelegationFiat = createDeepEqualOutputSelector(
  selectAllStakingUndelegationCrypto,
  selectMarketData,
  (state: ReduxState) => state.assets.byId,
  (allStaked: { [k: string]: string }, marketData, assetsById) => {
    const allStakingData = Object.entries(allStaked)

    const totalStakingDelegationFiat = reduce(
      allStakingData,
      (acc, [accountSpecifier, baseUnitAmount]) => {
        const assetId = accountIdToFeeAssetId(accountSpecifier)
        const price = marketData[assetId]?.price ?? 0
        const amount = fromBaseUnit(baseUnitAmount, assetsById[assetId].precision ?? 0)
        return bnOrZero(amount).times(price).plus(acc)
      },
      bn(0),
    )

    return totalStakingDelegationFiat
  },
)

export const selectPortfolioTotalFiatBalanceWithStakingData = createSelector(
  selectPortfolioTotalFiatBalance,
  selectTotalStakingDelegationFiat,
  selectTotalStakingUndelegationFiat,
  selectFarmContractsFiatBalance,
  (
    portfolioFiatBalance,
    delegationFiatBalance,
    undelegationFiatBalance,
    foxFarmingFiatBalance,
  ): string => {
    return bnOrZero(portfolioFiatBalance)
      .plus(delegationFiatBalance)
      .plus(undelegationFiatBalance)
      .plus(foxFarmingFiatBalance)
      .toString()
  },
)

export const selectPortfolioFiatBalanceByAssetId = createSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParamFromFilter,
  (portfolioFiatBalances, assetId) => portfolioFiatBalances[assetId],
)

export const selectPortfolioFiatBalanceByFilter = createSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatAccountBalances,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilterOptional,
  (portfolioAssetFiatBalances, portfolioAccountFiatbalances, assetId, accountId): string => {
    if (assetId && !accountId) return portfolioAssetFiatBalances?.[assetId] ?? '0'
    if (assetId && accountId) return portfolioAccountFiatbalances?.[accountId]?.[assetId] ?? '0'
    if (!assetId && accountId) {
      const accountBalances = portfolioAccountFiatbalances[accountId]
      const totalAccountBalances = Object.values(accountBalances).reduce(
        (totalBalance: string, fiatBalance: string) => {
          return bnOrZero(totalBalance).plus(fiatBalance).toFixed(2)
        },
        '0',
      )
      return totalAccountBalances
    }
    return '0'
  },
)

export const selectPortfolioCryptoBalanceByAssetId = createSelector(
  selectPortfolioAssetBalances,
  selectAssetIdParamFromFilter,
  (byId, assetId): string => byId[assetId] ?? 0,
)

export const selectPortfolioCryptoHumanBalanceByFilter = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilterOptional,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) {
      return fromBaseUnit(
        bnOrZero(accountBalances?.[accountId]?.[assetId]),
        assets?.[assetId]?.precision ?? 0,
      )
    }

    return fromBaseUnit(bnOrZero(assetBalances[assetId]), assets?.[assetId]?.precision ?? 0)
  },
)

export const selectStakingDataByAccountSpecifier = createSelector(
  selectPortfolioAccounts,
  selectAccountSpecifierParamFromFilter,
  (portfolioAccounts, accountSpecifier): StakingDataByValidatorId | null => {
    return portfolioAccounts?.[accountSpecifier]?.stakingDataByValidatorId || null
  },
)

export const selectTotalStakingDelegationCryptoByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetIdParamFromFilter,
  // We make the assumption that all delegation rewards come from a single denom (asset)
  // In the future there may be chains that support rewards in multiple denoms and this will need to be parsed differently
  (stakingData, assetId): string => {
    const delegations = Object.values(stakingData || {})
      .flatMap(validatorStaking => validatorStaking[assetId]?.delegations?.[0])
      .filter(Boolean)
    const amount = reduce(
      delegations,
      (acc, delegation) => acc.plus(bnOrZero(delegation.amount)),
      bn(0),
    )

    return amount.toString()
  },
)

export const selectTotalStakingUndelegationCryptoByAccountSpecifier = createSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetIdParamFromFilter,
  // We make the assumption that all delegation rewards come from a single denom (asset)
  // In the future there may be chains that support rewards in multiple denoms and this will need to be parsed differently
  (stakingData, assetId) => {
    if (!stakingData) return '0'

    const stakingDataFilteredByAssetId = Object.values(stakingData).flatMap(
      validatorStakingData => validatorStakingData[assetId],
    )
    const amount = Object.values(stakingDataFilteredByAssetId)
      .reduce((acc, validatorStakingData) => {
        validatorStakingData?.undelegations?.forEach(undelegationEntry => {
          acc = acc.plus(undelegationEntry.amount)
        })

        return acc
      }, bn(0))
      .toString()

    return amount
  },
)

export const selectTotalStakingDelegationCryptoByFilter = createSelector(
  selectAssetIdParamFromFilterOptional,
  (state: ReduxState) => state.assets.byId,
  selectTotalStakingDelegationCryptoByAccountSpecifier,
  selectTotalStakingUndelegationCryptoByAccountSpecifier,
  (assetId, assets, totalDelegations, totalUndelegations) => {
    const total = bnOrZero(totalDelegations).plus(totalUndelegations)
    return fromBaseUnit(total, assets?.[assetId]?.precision ?? 0).toString()
  },
)

export const selectTotalFiatBalanceWithDelegations = createSelector(
  selectPortfolioCryptoHumanBalanceByFilter,
  selectTotalStakingDelegationCryptoByFilter,
  selectMarketData,
  selectAssetIdParamFromFilter,
  (cryptoBalance, delegationCryptoBalance, marketData, assetId): string => {
    const price = marketData[assetId]?.price ?? 0
    const cryptoBalanceWithDelegations = bnOrZero(cryptoBalance)
      .plus(delegationCryptoBalance)
      .toString()

    return bnOrZero(cryptoBalanceWithDelegations).times(price).toString()
  },
)

export const selectTotalCryptoBalanceWithDelegations = createSelector(
  selectPortfolioCryptoHumanBalanceByFilter,
  selectTotalStakingDelegationCryptoByFilter,
  (cryptoBalance, delegationCryptoBalance): string => {
    const cryptoBalanceWithDelegations = bnOrZero(cryptoBalance)
      .plus(delegationCryptoBalance)
      .toString()

    return bnOrZero(cryptoBalanceWithDelegations).toString()
  },
)

/**
 * this selector is very specific; we need to consider
 * - raw account balances, that are
 * - above a threshold, including
 *   - delegations
 *   - redelegations
 *   - undelegations
 *   as delegations don't show in account balances, but we want them included in the total
 */
export const selectBalanceChartCryptoBalancesByAccountIdAboveThreshold =
  createDeepEqualOutputSelector(
    selectAssets,
    selectPortfolioAccountBalances,
    selectPortfolioAssetBalances,
    selectMarketData,
    selectBalanceThreshold,
    selectPortfolioAccounts,
    selectLpPlusFarmContractsBaseUnitBalance,
    (_state: ReduxState, accountId?: string) => accountId,
    (
      assetsById,
      accountBalances,
      assetBalances,
      marketData,
      balanceThreshold,
      portfolioAccounts,
      lpPlusFarmContractsBaseUnitBalance,
      accountId,
    ): PortfolioBalancesById => {
      const rawBalances = (accountId ? accountBalances[accountId] : assetBalances) ?? {}
      // includes delegation, redelegation, and undelegation balances
      const totalBalancesIncludingAllDelegationStates: PortfolioBalancesById = Object.values(
        portfolioAccounts,
      ).reduce((acc, account) => {
        Object.values(account?.stakingDataByValidatorId ?? {}).forEach(
          stakingDataByAccountSpecifier => {
            Object.values(stakingDataByAccountSpecifier).forEach(stakingData => {
              const { delegations, redelegations, undelegations } = stakingData
              const redelegationEntries = redelegations.flatMap(
                redelegation => redelegation.entries,
              )
              const combined = [...delegations, ...redelegationEntries, ...undelegations]
              combined.forEach(entry => {
                const { assetId, amount } = entry
                acc[assetId] = bnOrZero(acc[assetId]).plus(amount).toString()
              })
            })
          },
        )
        return acc
      }, cloneDeep(rawBalances))
      totalBalancesIncludingAllDelegationStates[foxEthLpAssetId] =
        lpPlusFarmContractsBaseUnitBalance
      const aboveThresholdBalances = Object.entries(
        totalBalancesIncludingAllDelegationStates,
      ).reduce<PortfolioAssetBalances['byId']>((acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        // if it's above the threshold set the original object key and value to result
        acc[assetId] = baseUnitBalance
        return acc
      }, {})
      return aboveThresholdBalances
    },
  )

export const selectPortfolioCryptoBalanceByFilter = createSelector(
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilterOptional,
  selectAssetIdParamFromFilter,
  (accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) {
      return accountBalances?.[accountId]?.[assetId] ?? '0'
    }
    return assetBalances[assetId] ?? '0'
  },
)

export const selectPortfolioCryptoHumanBalanceByAssetId = createSelector(
  selectAssets,
  selectPortfolioAssetBalances,
  selectAssetIdParamFromFilter,
  (assets, balances, assetId): string =>
    fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0),
)

export const selectPortfolioMixedHumanBalancesBySymbol = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  (assets, marketData, balances) =>
    Object.entries(balances).reduce<{ [k: AssetId]: { crypto: string; fiat: string } }>(
      (acc, [assetId, balance]) => {
        const precision = assets[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(balance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price)).toFixed(2)
        acc[assets[assetId].assetId] = { crypto: cryptoValue, fiat: assetFiatBalance }
        return acc
      },
      {},
    ),
)

export const selectPortfolioAssets = createSelector(
  selectAssets,
  selectPortfolioAssetIds,
  (assetsById, portfolioAssetIds): { [k: AssetId]: Asset } =>
    portfolioAssetIds.reduce<PortfolioAssets>((acc, cur) => {
      acc[cur] = assetsById[cur]
      return acc
    }, {}),
)

export const selectPortfolioAccountIds = (state: ReduxState): AccountSpecifier[] =>
  state.portfolio.accounts.ids

/**
 * selects portfolio account ids that *can* contain an assetId
 * e.g. we may be swapping into a new EVM account that does not necessarily contain FOX
 * but can contain it
 */
export const selectPortfolioAccountIdsByAssetId = createCachedSelector(
  selectPortfolioAccountIds,
  selectAssetIdParamFromFilter,
  (accountIds, assetId): AccountId[] => {
    // early return for scenarios where assetId is not available yet
    if (!assetId) return []
    const { chainId } = fromAssetId(assetId)
    return accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)
  },
)((_accountIds, { assetId }) => assetId ?? 'undefined')

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectPortfolioLoading = createSelector(
  selectPortfolioAccountIds,
  (ids): boolean => !Boolean(ids.length),
)

export const selectPortfolioAssetBalancesSortedFiat = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): { [k: AssetId]: string } =>
    Object.entries(portfolioFiatBalances)
      .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
      .reduce<PortfolioAssetBalances['byId']>((acc, [assetId, assetFiatBalance]) => {
        acc[assetId] = assetFiatBalance
        return acc
      }, {}),
)

export const selectPortfolioAssetAccountBalancesSortedFiat = createSelector(
  selectPortfolioFiatAccountBalances,
  selectBalanceThreshold,
  (portfolioFiatAccountBalances, balanceThreshold): PortfolioAccountBalancesById => {
    return Object.entries(portfolioFiatAccountBalances).reduce<PortfolioAccountBalancesById>(
      (acc, [accountId, assetBalanceObj]) => {
        const sortedAssetsByFiatBalances = Object.entries(assetBalanceObj)
          .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
          .reduce<{ [k: AssetId]: string }>((acc, [assetId, assetFiatBalance]) => {
            if (bnOrZero(assetFiatBalance).lt(bnOrZero(balanceThreshold))) return acc
            acc[assetId] = assetFiatBalance
            return acc
          }, {})

        acc[accountId] = sortedAssetsByFiatBalances
        return acc
      },
      {},
    )
  },
)

export const selectHighestFiatBalanceAccountByAssetId = createSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectAssetIdParamFromFilter,
  (accountSpecifierAssetValues, assetId): AccountSpecifier | undefined => {
    const accountValueMap = Object.entries(accountSpecifierAssetValues).reduce((acc, [k, v]) => {
      const assetValue = v[assetId]
      return assetValue ? acc.set(k, assetValue) : acc
    }, new Map<AccountSpecifier, string>())
    const highestBalanceAccountToAmount = maxBy([...accountValueMap], ([_, v]) =>
      bnOrZero(v).toNumber(),
    )
    return highestBalanceAccountToAmount?.[0]
  },
)

export const selectPortfolioAssetIdsSortedFiat = createSelector(
  selectPortfolioAssetBalancesSortedFiat,
  (sortedBalances): AssetId[] => Object.keys(sortedBalances),
)

export const selectPortfolioAllocationPercent = createSelector(
  selectPortfolioTotalFiatBalance,
  selectPortfolioFiatBalances,
  (totalBalance, fiatBalances): { [k: AssetId]: number } =>
    Object.entries(fiatBalances).reduce<{ [k: AssetId]: number }>((acc, [assetId, fiatBalance]) => {
      acc[assetId] = bnOrZero(fiatBalance).div(bnOrZero(totalBalance)).times(100).toNumber()
      return acc
    }, {}),
)

export const selectPortfolioTotalFiatBalanceByAccount = createSelector(
  selectPortfolioFiatAccountBalances,
  selectBalanceThreshold,
  (accountBalances, balanceThreshold) => {
    return Object.entries(accountBalances).reduce<{ [k: AccountSpecifier]: string }>(
      (acc, [accountId, balanceObj]) => {
        const totalAccountFiatBalance = Object.values(balanceObj).reduce(
          (totalBalance, currentBalance) => {
            return bnOrZero(bn(totalBalance).plus(bn(currentBalance)))
          },
          bnOrZero('0'),
        )
        if (totalAccountFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        acc[accountId] = totalAccountFiatBalance.toFixed(2)
        return acc
      },
      {},
    )
  },
)

export const selectPortfolioAllocationPercentByFilter = createSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatAccountBalances,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assetFiatBalances, assetFiatBalancesByAccount, accountId, assetId) => {
    const totalAssetFiatBalance = assetFiatBalances[assetId]
    const balanceAllocationById = Object.entries(assetFiatBalancesByAccount).reduce<{
      [k: AccountSpecifier]: number
    }>((acc, [currentAccountId, assetAccountFiatBalance]) => {
      const allocation = bnOrZero(
        bn(assetAccountFiatBalance[assetId]).div(totalAssetFiatBalance).times(100),
      ).toNumber()

      acc[currentAccountId] = allocation
      return acc
    }, {})

    return balanceAllocationById[accountId]
  },
)

export const selectPortfolioAccountIdsSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioTotalFiatBalanceByAccount,
  selectAssets,
  (totalAccountBalances, assets) => {
    const sortedAccountBalances = makeSortedAccountBalances(totalAccountBalances)
    const sortedAccountBalancesByChainBuckets = makeBalancesByChainBucketsFlattened(
      sortedAccountBalances,
      assets,
    )
    return sortedAccountBalancesByChainBuckets
  },
)

/**
 * selects all accounts in PortfolioAccountBalancesById form, including all
 * delegation, undelegation, and redelegation balances, with base unit crypto balances
 */
export const selectPortfolioAccountsCryptoBalancesIncludingStaking = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectPortfolioAccountBalances,
  (accounts, accountBalances): PortfolioAccountBalancesById => {
    return Object.entries(accounts).reduce((acc, [accountId, account]) => {
      Object.values(account?.stakingDataByValidatorId ?? {}).forEach(stakingDataByAssetId => {
        Object.values(stakingDataByAssetId).forEach(stakingData => {
          const { delegations, redelegations, undelegations } = stakingData
          const redelegationEntries = redelegations.flatMap(redelegation => redelegation.entries)
          const combined = [...delegations, ...redelegationEntries, ...undelegations]
          combined.forEach(({ assetId, amount }) => {
            acc[accountId][assetId] = bnOrZero(acc[accountId][assetId]).plus(amount).toString()
          })
        })
      })
      return acc
    }, cloneDeep(accountBalances))
  },
)

/**
 * same PortfolioAccountBalancesById shape, but human crypto balances
 */
export const selectPortfolioAccountsCryptoHumanBalancesIncludingStaking =
  createDeepEqualOutputSelector(
    selectAssets,
    selectPortfolioAccountsCryptoBalancesIncludingStaking,
    (assets, portfolioAccountsCryptoBalances): PortfolioAccountBalancesById => {
      return Object.entries(portfolioAccountsCryptoBalances).reduce((acc, [accountId, account]) => {
        acc[accountId] = Object.entries(account).reduce((innerAcc, [assetId, cryptoBalance]) => {
          innerAcc[assetId] = fromBaseUnit(cryptoBalance, assets[assetId].precision)
          return innerAcc
        }, cloneDeep(account))
        return acc
      }, cloneDeep(portfolioAccountsCryptoBalances))
    },
  )

/**
 * this returns the same shape as the input selector selectPortfolioAccountsCryptoBalancesIncludingStaking
 * but with values converted into fiat, and sorted by fiat at all levels
 */
export const selectPortfolioAccountsFiatBalancesIncludingStaking = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAccountsCryptoBalancesIncludingStaking,
  (assets, marketData, portfolioAccountsCryptoBalances): PortfolioAccountBalancesById => {
    const fiatAccountEntries = Object.entries(portfolioAccountsCryptoBalances).reduce<{
      [k: AccountId]: { [k: AssetId]: string }
    }>((acc, [accountId, account]) => {
      const entries: [AssetId, BigNumber][] = Object.entries(account).map(
        ([assetId, cryptoBalance]) => {
          const { precision } = assets[assetId]
          const price = marketData[assetId]?.price ?? 0
          return [assetId, bnOrZero(fromBaseUnit(cryptoBalance, precision)).times(price)]
        },
      )

      const fiatAccountSorted = Object.fromEntries(
        entries
          .sort(([, a], [, b]) => (a.gt(b) ? -1 : 1))
          .map(([assetId, fiatBalance]) => [assetId, fiatBalance.toFixed(2)]),
      )
      acc[accountId] = fiatAccountSorted
      return acc
    }, {})

    const sumValues: (obj: Record<AssetId, string>) => number = obj =>
      sum(values(obj).map(toNumber))

    return (
      entries(fiatAccountEntries)
        // sum each account
        .map<[string, number]>(([accountId, account]) => [accountId, sumValues(account)])
        // sort by account balance
        .sort(([, sumA], [, sumB]) => (sumA > sumB ? -1 : 1))
        // return sorted accounts
        .reduce<PortfolioAccountBalancesById>((acc, [accountId]) => {
          acc[accountId] = fiatAccountEntries[accountId]
          return acc
        }, {})
    )
  },
)

export const selectPortfolioChainIdsSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  (fiatAccountBalances): ChainId[] =>
    Array.from(
      new Set(Object.keys(fiatAccountBalances).map(accountId => fromAccountId(accountId).chainId)),
    ),
)

export const selectPortfolioTotalBalanceByChainIdIncludeStaking = createSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectChainIdParamFromFilter,
  (fiatAccountBalances, chainId): string => {
    return Object.entries(fiatAccountBalances)
      .reduce((acc, [accountId, accountBalanceByAssetId]) => {
        if (fromAccountId(accountId).chainId !== chainId) return acc
        Object.values(accountBalanceByAssetId).forEach(assetBalance => {
          // use the outer accumulator
          acc = acc.plus(bnOrZero(assetBalance))
        })
        return acc
      }, bn(0))
      .toFixed(2)
  },
)

export const selectPortfolioAccountBalanceByAccountNumberAndChainId = createSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectPortfolioAccountMetadata,
  selectAccountNumberParamFromFilter,
  selectChainIdParamFromFilter,
  (accountBalances, accountMetadata, accountNumberString, chainId): string => {
    const accountNumber = parseInt(accountNumberString.toString())
    if (!Number.isInteger(accountNumber))
      throw new Error(`failed to parse accountNumberString ${accountNumberString}`)
    return Object.entries(accountBalances)
      .reduce((acc, [accountId, accountBalanceByAssetId]) => {
        if (fromAccountId(accountId).chainId !== chainId) return acc
        if (accountNumber !== accountMetadata[accountId].bip44Params.accountNumber) return acc
        return acc.plus(
          Object.values(accountBalanceByAssetId).reduce(
            (innerAcc, cur) => innerAcc.plus(bnOrZero(cur)),
            bn(0),
          ),
        )
      }, bn(0))
      .toFixed(2)
  },
)

export type PortfolioAccountsGroupedByNumber = { [accountNumber: number]: AccountId[] }

export const selectPortfolioAccountsGroupedByNumberByChainId = createDeepEqualOutputSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectPortfolioAccountMetadata,
  selectChainIdParamFromFilter,
  (accountBalances, accountMetadata, chainId): PortfolioAccountsGroupedByNumber => {
    return Object.keys(accountBalances).reduce<PortfolioAccountsGroupedByNumber>(
      (acc, accountId) => {
        if (fromAccountId(accountId).chainId !== chainId) return acc
        const { accountNumber } = accountMetadata[accountId].bip44Params
        if (!acc[accountNumber]) acc[accountNumber] = []
        acc[accountNumber].push(accountId)
        return acc
      },
      {},
    )
  },
)

export const selectPortfolioIsEmpty = createSelector(
  selectPortfolioAssetIds,
  (assetIds): boolean => !assetIds.length,
)

export const selectPortfolioAssetAccounts = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (portfolioAccounts, assetId): AccountSpecifier[] =>
    Object.keys(portfolioAccounts).filter(accountSpecifier =>
      portfolioAccounts[accountSpecifier].assetIds.find(
        accountAssetId => accountAssetId === assetId,
      ),
    ),
)

export const selectPortfolioAccountById = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, accountId: AccountSpecifier) => accountId,
  (portfolioAccounts, accountId) => portfolioAccounts[accountId].assetIds,
)

export const selectPortfolioAssetIdsByAccountId = createSelector(
  selectPortfolioAccountBalances,
  selectAccountIdParamFromFilter,
  (accounts, accountId) => Object.keys(accounts[accountId]),
)

export const selectPortfolioAssetIdsByAccountIdExcludeFeeAsset = createDeepEqualOutputSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectAccountIdParamFromFilter,
  selectAssets,
  selectBalanceThreshold,
  (accountAssets, accountId, assets, balanceThreshold) => {
    const assetsByAccountIds = accountAssets?.[accountId] ?? {}
    return Object.entries(assetsByAccountIds)
      .filter(
        ([assetId, assetFiatBalance]) =>
          !FEE_ASSET_IDS.includes(assetId) &&
          assets[assetId] &&
          bnOrZero(assetFiatBalance).gte(bnOrZero(balanceThreshold)),
      )
      .map(([assetId]) => assetId)
  },
)

export const selectAccountIdByAddress = createSelector(
  selectAccountIds,
  selectAccountSpecifierParamFromFilter,
  (portfolioAccounts: { [k: AccountSpecifier]: AccountId[] }, filterAccountId): string => {
    let accountSpecifier = ''
    for (const portfolioAccount in portfolioAccounts) {
      const isAccountSpecifier = !!portfolioAccounts[portfolioAccount].find(
        accountId => toLower(accountId) === toLower(filterAccountId),
      )
      if (isAccountSpecifier) {
        accountSpecifier = portfolioAccount
        break
      }
    }
    return accountSpecifier
  },
)

export const selectAccountIdsByAssetId = createSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  findAccountsByAssetId,
)

export const selectAccountIdsByAssetIdAboveBalanceThreshold = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  selectPortfolioFiatAccountBalances,
  selectBalanceThreshold,
  (portfolioAccounts, assetId, accountBalances, balanceThreshold) => {
    const accounts = findAccountsByAssetId(portfolioAccounts, assetId)
    const aboveThreshold = Object.entries(accountBalances).reduce<AccountSpecifier[]>(
      (acc, [accountId, balanceObj]) => {
        if (accounts.includes(accountId)) {
          const totalAccountFiatBalance = Object.values(balanceObj).reduce(
            (totalBalance, currentBalance) => {
              return bnOrZero(bn(totalBalance).plus(bn(currentBalance)))
            },
            bnOrZero('0'),
          )
          if (totalAccountFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
          acc.push(accountId)
        }
        return acc
      },
      [],
    )
    return aboveThreshold
  },
)

export type AccountRowData = {
  name: string
  icon: string
  symbol: string
  fiatAmount: string
  cryptoAmount: string
  assetId: AccountSpecifier
  allocation: number
  price: string
  priceChange: number
}

export const selectPortfolioAccountRows = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectPortfolioTotalFiatBalance,
  selectBalanceThreshold,
  (
    assetsById,
    marketData,
    balances,
    totalPortfolioFiatBalance,
    balanceThreshold,
  ): AccountRowData[] => {
    const assetRows = Object.entries(balances).reduce<AccountRowData[]>(
      (acc, [assetId, baseUnitBalance]) => {
        const name = assetsById[assetId]?.name
        const icon = assetsById[assetId]?.icon
        const symbol = assetsById[assetId]?.symbol
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price ?? '0'
        const cryptoAmount = fromBaseUnit(baseUnitBalance, precision)
        const fiatAmount = bnOrZero(cryptoAmount).times(bnOrZero(price))
        /**
         * if fiatAmount is less than the selected threshold,
         * continue to the next asset balance by returning acc
         */
        if (fiatAmount.lt(bnOrZero(balanceThreshold))) return acc
        const allocation = bnOrZero(fiatAmount.toFixed(2))
          .div(bnOrZero(totalPortfolioFiatBalance))
          .times(100)
          .toNumber()
        const priceChange = marketData[assetId]?.changePercent24Hr ?? 0
        const data = {
          assetId,
          name,
          icon,
          symbol,
          fiatAmount: fiatAmount.toFixed(2),
          cryptoAmount,
          allocation,
          price,
          priceChange,
        }
        acc.push(data)
        return acc
      },
      [],
    )
    return assetRows
  },
)

export const selectPortfolioBridgeAssets = createSelector(
  selectPortfolioAccountRows,
  (portfolioAssets): BridgeAsset[] => {
    return Object.entries(portfolioAssets).map(([_, v]) => {
      const implementations = undefined // TODO: implement here
      return {
        assetId: v.assetId,
        symbol: v.symbol,
        icon: v.icon,
        name: v.name,
        cryptoAmount: v.cryptoAmount,
        fiatAmount: v.fiatAmount,
        implementations,
      }
    })
  },
)

export type ActiveStakingOpportunity = {
  address: PubKey
  moniker: string
  apr: string
  tokens?: string
  cryptoAmount?: string
  rewards?: string
}

export type AmountByValidatorAddressType = {
  // This maps from validator pubkey -> staked asset in base precision
  // e.g for 1 ATOM staked on ShapeShift DAO validator:
  // {"cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf": "1000000"}
  [k: PubKey]: string
}

export const selectDelegationCryptoAmountByAssetIdAndValidator = createSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddressParamFromFilter,
  selectAssetIdParamFromFilter,
  (stakingData, validatorAddress, assetId): string => {
    return stakingData?.[validatorAddress]?.[assetId]?.delegations[0]?.amount ?? '0'
  },
)

export const selectUnbondingEntriesByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddressParamFromFilter,
  selectAssetIdParamFromFilter,
  (stakingDataByValidator, validatorAddress, assetId): cosmossdk.UndelegationEntry[] => {
    const validatorStakingData = stakingDataByValidator?.[validatorAddress]?.[assetId]

    if (!validatorStakingData?.undelegations?.length) return []

    return validatorStakingData.undelegations
  },
)

export const selectUnbondingCryptoAmountByAssetIdAndValidator = createDeepEqualOutputSelector(
  selectUnbondingEntriesByAccountSpecifier,
  (unbondingEntries): string => {
    if (!unbondingEntries.length) return '0'

    const unbondingCryptoAmountByAssetIdAndValidator = unbondingEntries
      .reduce((acc, current) => {
        return acc.plus(bnOrZero(current.amount))
      }, bn(0))
      .toString()

    return unbondingCryptoAmountByAssetIdAndValidator
  },
)

export const selectTotalBondingsBalanceByAssetId = createSelector(
  selectUnbondingCryptoAmountByAssetIdAndValidator,
  selectDelegationCryptoAmountByAssetIdAndValidator,
  (unbondingCryptoBalance, delegationCryptoBalance): string => {
    return bnOrZero(unbondingCryptoBalance).plus(bnOrZero(delegationCryptoBalance)).toString()
  },
)

export const selectRewardsByValidator = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectValidatorAddressParamFromFilter,
  selectAccountSpecifierParamFromFilter,
  selectAssetIdParamFromFilter,
  (allPortfolioAccounts, validatorAddress, accountSpecifier, assetId): string => {
    const cosmosAccount = allPortfolioAccounts?.[accountSpecifier]

    if (!cosmosAccount) return '0'

    const rewards =
      cosmosAccount.stakingDataByValidatorId?.[validatorAddress]?.[assetId]?.rewards?.[0]?.amount ??
      '0'

    return rewards
  },
)

// New array object reference every time we return this expression: [SHAPESHIFT_VALIDATOR_ADDRESS]
// We need to explicitly deep output compare, since ([SHAPESHIFT_VALIDATOR_ADDRESS] === [SHAPESHIFT_VALIDATOR_ADDRESS]) === false
export const selectValidatorIds = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectAccountSpecifierParamFromFilter,
  (portfolioAccounts, accountSpecifier): PubKey[] => {
    const portfolioAccount = portfolioAccounts?.[accountSpecifier]
    if (!portfolioAccount) return []
    if (!portfolioAccount?.validatorIds?.length)
      return [getDefaultValidatorAddressFromAccountId(accountSpecifier)]

    return portfolioAccount.validatorIds
  },
)

const selectDefaultStakingDataByValidatorId = createSelector(
  selectAssetIdParamFromFilterOptional,
  selectSupportsCosmosSdkParamFromFilterOptional,
  selectValidators,
  (assetId, supportsCosmosSdk = true, stakingDataByValidator) => {
    if (supportsCosmosSdk || !assetId) return null

    const defaultValidatorAddress = getDefaultValidatorAddressFromAssetId(assetId)

    return stakingDataByValidator[defaultValidatorAddress]
  },
)
export const selectStakingOpportunitiesDataFull = createDeepEqualOutputSelector(
  selectValidatorIds,
  selectValidators,
  selectStakingDataByAccountSpecifier,
  selectAssetIdParamFromFilter,
  selectDefaultStakingDataByValidatorId,
  (
    validatorIds,
    validatorsData,
    stakingDataByValidator,
    assetId,
    defaultStakingData,
  ): OpportunitiesDataFull[] => {
    if (defaultStakingData && !validatorIds.length)
      return [
        {
          isLoaded: true,
          rewards: '0',
          totalDelegations: '0',
          ...defaultStakingData,
        },
      ]
    return validatorIds.map(validatorId => {
      const delegatedAmount = bnOrZero(
        stakingDataByValidator?.[validatorId]?.[assetId]?.delegations?.[0]?.amount,
      ).toString()
      const undelegatedEntries: cosmossdk.UndelegationEntry[] =
        stakingDataByValidator?.[validatorId]?.[assetId]?.undelegations ?? []
      const totalDelegations = bnOrZero(delegatedAmount)
        .plus(
          undelegatedEntries.reduce<BN>(
            (acc, current) => acc.plus(bnOrZero(current.amount)),
            bn(0),
          ),
        )
        .toString()
      return {
        ...validatorsData[validatorId],
        // Delegated/Redelegated + Undelegation
        totalDelegations,
        // Rewards at 0 index: since we normalize staking data, we are guaranteed to have only one entry for the validatorId + assetId combination
        rewards: stakingDataByValidator?.[validatorId]?.[assetId]?.rewards?.[0]?.amount ?? '0',
        isLoaded: Boolean(validatorsData[validatorId]),
      }
    })
  },
)

export const selectHasActiveStakingOpportunity = createSelector(
  selectStakingOpportunitiesDataFull,
  stakingOpportunitiesData =>
    // More than one opportunity data means we have more than the default opportunity
    size(stakingOpportunitiesData) > 1 ||
    // If there's only one staking but it isn't the default opportunity, then it's an active staking
    (stakingOpportunitiesData[0]?.address !== SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS &&
      stakingOpportunitiesData[0]?.address !== SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS) ||
    bnOrZero(stakingOpportunitiesData[0]?.rewards).gt(0) ||
    bnOrZero(stakingOpportunitiesData[0]?.totalDelegations).gt(0),
)
