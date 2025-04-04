import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import qs from 'qs'
import React, { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import { EquityRow } from './EquityRow'

import { WalletActions } from '@/context/WalletProvider/actions'
import {
  DefiAction,
  DefiTypeDisplayName,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { OpportunityId } from '@/state/slices/opportunitiesSlice/types'
import { DefiProvider } from '@/state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from '@/state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectAssetById,
  selectAssets,
  selectIsAnyOpportunitiesApiQueryPending,
  selectMarketDataByAssetIdUserCurrency,
  selectUnderlyingStakingAssetsWithBalancesAndIcons,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EquityStakingRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
  accountId?: AccountId
  color?: string
  totalFiatBalance?: string
}
export const EquityStakingRow: React.FC<EquityStakingRowProps> = ({
  opportunityId,
  assetId,
  accountId,
  totalFiatBalance,
  color,
}) => {
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const history = useHistory()
  const location = useLocation()
  const assets = useAppSelector(selectAssets)
  const isLoading = useAppSelector(selectIsAnyOpportunitiesApiQueryPending)
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])
  const stakingOpportunities = useAppSelector(state =>
    selectAllEarnUserStakingOpportunitiesByFilter(state, filter),
  )
  const opportunity = stakingOpportunities.find(opportunity => opportunity.id === opportunityId)
  const underlyingAssetId = opportunity?.underlyingAssetId
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId ?? ''))

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    opportunity?.userStakingId
      ? selectUnderlyingStakingAssetsWithBalancesAndIcons(state, {
          userStakingId: opportunity.userStakingId,
        })
      : undefined,
  )

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )

  const { amountCryptoPrecision, amountUserCurrency } = useMemo(() => {
    if (!opportunity || !asset || !assetMarketData)
      return {
        amountCryptoPrecision: '0',
        amountUserCurrency: '0',
      }

    const underlyingAssetBalance = underlyingAssetsWithBalancesAndIcons?.find(
      ({ assetId: balanceAssetId }) => assetId === balanceAssetId,
    )

    if (!underlyingAssetBalance && underlyingAsset)
      return {
        amountCryptoPrecision: fromBaseUnit(
          opportunity.cryptoAmountBaseUnit,
          underlyingAsset.precision,
        ),
        amountUserCurrency: opportunity.fiatAmount,
      }

    return {
      amountCryptoPrecision: bnOrZero(underlyingAssetBalance?.cryptoBalancePrecision).toFixed(),
      amountUserCurrency: bnOrZero(underlyingAssetBalance?.cryptoBalancePrecision)
        .times(assetMarketData.price)
        .toFixed(),
    }
  }, [
    opportunity,
    assetId,
    asset,
    underlyingAssetsWithBalancesAndIcons,
    underlyingAsset,
    assetMarketData,
  ])

  const handleClick = useCallback(() => {
    if (!opportunity) return
    const {
      type,
      provider,
      contractAddress,
      chainId,
      rewardAddress,
      assetId,
      highestBalanceAccountAddress,
    } = opportunity
    const { assetReference, assetNamespace } = fromAssetId(assetId)

    if (!isConnected) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }

    trackOpportunityEvent(
      MixPanelEvent.ClickOpportunity,
      {
        opportunity,
        element: 'Equity Staking Row',
      },
      assets,
    )

    if (provider === DefiProvider.rFOX) {
      return history.push('/rfox')
    }

    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        type,
        provider,
        chainId,
        contractAddress,
        assetNamespace,
        assetReference,
        highestBalanceAccountAddress,
        rewardId: rewardAddress,
        modal: DefiAction.Overview,
      }),
      state: { background: location },
    })
  }, [assets, dispatch, history, isConnected, location, opportunity])

  if (!opportunity || !asset) return null
  return (
    <EquityRow
      accountId={accountId}
      onClick={handleClick}
      fiatAmount={amountUserCurrency}
      totalFiatBalance={totalFiatBalance}
      color={color}
      icon={getMetadataForProvider(opportunity.provider)?.icon}
      label={opportunity.provider}
      symbol={asset.symbol}
      subText={opportunity.version ?? DefiTypeDisplayName[opportunity.type]}
      apy={opportunity.apy}
      isLoading={isLoading}
      cryptoBalancePrecision={amountCryptoPrecision}
    />
  )
}
