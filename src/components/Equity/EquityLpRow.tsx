import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import React, { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAllEarnUserLpOpportunitiesByFilter,
  selectAssetById,
  selectAssets,
  selectOpportunityApiPending,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

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
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const history = useHistory()
  const location = useLocation()
  const isLoading = useAppSelector(selectOpportunityApiPending)
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
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
    marketData,
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

    if (!isConnected && isDemoWallet) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }

    trackOpportunityEvent(
      MixPanelEvents.ClickOpportunity,
      {
        opportunity,
        element: 'Equity LP Row',
      },
      assets,
    )

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
  }, [assets, dispatch, history, isConnected, isDemoWallet, location, opportunity])

  if (!opportunity || !asset || !underlyingBalances[assetId]) return null

  return (
    <EquityRow
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
