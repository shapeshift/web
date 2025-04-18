import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import React, { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { EquityRow } from './EquityRow'

import { WalletActions } from '@/context/WalletProvider/actions'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { OpportunityId } from '@/state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from '@/state/slices/opportunitiesSlice/utils'
import { getMetadataForProvider } from '@/state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAllEarnUserLpOpportunitiesByFilter,
  selectAssetById,
  selectAssets,
  selectIsAnyOpportunitiesApiQueryPending,
  selectMarketDataUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EquityLpRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
  accountId?: AccountId
  totalFiatBalance?: string
  color?: string
}
export const EquityLpRow: React.FC<EquityLpRowProps> = ({
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
  const navigate = useNavigate()
  const location = useLocation()
  const isLoading = useAppSelector(selectIsAnyOpportunitiesApiQueryPending)
  const assets = useAppSelector(selectAssets)
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])
  const lpOpportunities = useAppSelector(state =>
    selectAllEarnUserLpOpportunitiesByFilter(state, filter),
  )
  const opportunity = lpOpportunities.find(opportunity => opportunity.id === opportunityId)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!opportunity) throw new Error(`No opportunity found for ${assetId}`)
  if (!assetId) throw new Error(`No assetId ${assetId}`)

  const underlyingBalances = getUnderlyingAssetIdsBalances({
    underlyingAssetIds: opportunity.underlyingAssetIds,
    underlyingAssetRatiosBaseUnit: opportunity.underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit: opportunity.cryptoAmountBaseUnit,
    assetId: opportunity.id,
    assets,
    marketDataUserCurrency,
  })

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
        element: 'Equity LP Row',
      },
      assets,
    )

    navigate(
      {
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
      },
      {
        state: { background: location },
      },
    )
  }, [assets, dispatch, navigate, isConnected, location, opportunity])

  if (!opportunity || !asset || !underlyingBalances[assetId]) return null

  return (
    <EquityRow
      accountId={accountId}
      onClick={handleClick}
      icon={getMetadataForProvider(opportunity.provider)?.icon ?? ''}
      label={opportunity.provider}
      fiatAmount={underlyingBalances[assetId].fiatAmount}
      cryptoBalancePrecision={underlyingBalances[assetId].cryptoBalancePrecision}
      symbol={asset.symbol}
      totalFiatBalance={totalFiatBalance}
      color={color}
      apy={opportunity.apy}
      isLoading={isLoading}
      subText={opportunity.opportunityName}
    />
  )
}
