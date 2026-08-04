import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { RunePoolEmpty } from './RunePoolEmpty'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { DefiButtonProps } from '@/features/defi/components/DefiActionButtons'
import { Overview } from '@/features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatSecondsToDuration } from '@/lib/utils/time'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'
import { DefiProvider, DefiType } from '@/state/slices/opportunitiesSlice/types'
import {
  isRunePoolUserStakingOpportunity,
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  toOpportunityId,
} from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectOpportunitiesApiQueriesByFilter,
  selectTxsByFilter,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type OverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const RunePoolOverview: React.FC<OverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const [hideEmptyState, setHideEmptyState] = useState(false)
  const { chainId, assetReference, assetNamespace } = query

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestStakingBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestStakingBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestStakingBalanceAccountId],
  )

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const isRunePoolDepositEnabled = useFeatureFlag('RunePoolDeposit')
  const isRunepoolWithdrawEnabled = useFeatureFlag('RunePoolWithdraw')

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    if (!maybeAccountId?.length) return

    return {
      userStakingId: serializeUserStakingId(
        maybeAccountId,
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference,
        }),
      ),
    }
  }, [assetNamespace, assetReference, chainId, maybeAccountId])

  const earnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const stakedFiatBalance = useMemo(() => {
    if (!asset) return '0'

    const cryptoAmount = BigAmount.fromBaseUnit({
      value: earnOpportunityData?.stakedAmountCryptoBaseUnit ?? '0',
      precision: asset.precision,
    }).toPrecision()
    return bnOrZero(cryptoAmount)
      .times(bnOrZero(marketData?.price))
      .toString()
  }, [asset, marketData, earnOpportunityData?.stakedAmountCryptoBaseUnit])

  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    opportunityDataFilter
      ? selectUnderlyingStakingAssetsWithBalancesAndIcons(state, opportunityDataFilter)
      : undefined,
  )

  const hasPendingTxsFilter = useMemo(
    () => ({
      accountId,
      assetId,
    }),
    [accountId, assetId],
  )
  const hasPendingTxs = useAppSelector(state => selectTxsByFilter(state, hasPendingTxsFilter)).some(
    tx => tx.status === TxStatus.Pending,
  )

  const pendingQueriesFilter = useMemo(
    () => ({
      defiProvider: DefiProvider.RunePool,
      defiType: DefiType.Staking,
      queryStatus: QueryStatus.pending,
    }),
    [],
  )
  const hasPendingQueries = Boolean(
    useAppSelector(state => selectOpportunitiesApiQueriesByFilter(state, pendingQueriesFilter))
      .length,
  )

  const remainingLockupTime = useMemo(() => {
    if (!isRunePoolUserStakingOpportunity(earnOpportunityData)) return 0
    return Math.max(earnOpportunityData.dateUnlocked - Math.floor(Date.now() / 1000), 0)
  }, [earnOpportunityData])

  // RUNE is not a UTXO asset - the account address *is* the position address
  const positionAddress = useMemo(
    () => (maybeAccountId ? fromAccountId(maybeAccountId).account : undefined),
    [maybeAccountId],
  )

  const menu: DefiButtonProps[] = useMemo(() => {
    if (!earnOpportunityData) return []

    return [
      {
        label: 'common.deposit',
        icon: <ArrowUpIcon />,
        action: DefiAction.Deposit,
        isDisabled:
          hasPendingTxs ||
          hasPendingQueries ||
          isTradingActive === false ||
          !isRunePoolDepositEnabled,
        toolTip: (() => {
          if (!isRunePoolDepositEnabled)
            return translate('defi.modals.runePool.disabledDepositTitle')
          if (isTradingActive === false) return translate('defi.modals.runePool.haltedDepositTitle')
          if (hasPendingTxs || hasPendingQueries)
            return translate('defi.modals.runePool.cannotDepositWhilePendingTx')
        })(),
      },
      {
        label: 'common.withdraw',
        icon: <ArrowDownIcon />,
        action: DefiAction.Withdraw,
        isDisabled:
          hasPendingTxs ||
          hasPendingQueries ||
          !isRunepoolWithdrawEnabled ||
          Boolean(remainingLockupTime),
        toolTip: (() => {
          if (!isRunepoolWithdrawEnabled) {
            return translate('defi.modals.runePool.disabledWithdrawTitle')
          }

          if (remainingLockupTime) {
            return translate('defi.modals.runePool.withdrawLockedTitle', {
              timeHuman: formatSecondsToDuration(remainingLockupTime),
            })
          }

          if (hasPendingTxs || hasPendingQueries) {
            return translate('defi.modals.runePool.cannotWithdrawWhilePendingTx')
          }
        })(),
      },
    ]
  }, [
    earnOpportunityData,
    hasPendingQueries,
    hasPendingTxs,
    isRunePoolDepositEnabled,
    isRunepoolWithdrawEnabled,
    isTradingActive,
    remainingLockupTime,
    translate,
  ])

  const description = useMemo(
    () => ({
      description: translate('defi.modals.runePool.overviewDescription'),
      isLoaded: true,
      isTrustedDescription: true,
    }),
    [translate],
  )

  const handleRunePoolEmptyClick = useCallback(() => setHideEmptyState(true), [])

  if (!earnOpportunityData?.isLoaded || isTradingActiveLoading) {
    return (
      <Center minW='500px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  if (bnOrZero(stakedFiatBalance).eq(0) && !hideEmptyState) {
    return <RunePoolEmpty assetId={assetId} onClick={handleRunePoolEmptyClick} />
  }

  if (!asset) return null
  if (!underlyingAssetsWithBalancesAndIcons) return null

  return (
    <Overview
      accountId={maybeAccountId}
      onAccountIdChange={handleAccountIdChange}
      positionAddress={positionAddress}
      asset={asset}
      name={earnOpportunityData.name ?? ''}
      opportunityFiatBalance={stakedFiatBalance}
      underlyingAssetsCryptoPrecision={underlyingAssetsWithBalancesAndIcons}
      provider={makeDefiProviderDisplayName({
        provider: earnOpportunityData.provider,
        assetName: asset.name,
      })}
      description={description}
      tvl={bnOrZero(earnOpportunityData.tvl).toFixed(2)}
      apy={earnOpportunityData.apy}
      menu={menu}
    />
  )
}
