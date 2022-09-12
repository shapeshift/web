import type { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { type TradeState } from 'components/Trade/types'
import { selectFirstAccountSpecifierByChainId } from 'state/slices/accountSpecifiersSlice/selectors'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectHighestFiatBalanceAccountByAssetId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Accounts Service is responsible for reacting to changes to trade assets and selected accounts.
It mutates TradeState's sellAssetAccountId and buyAssetAccountId properties.
*/
export const useAccountsService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const selectedSellAssetAccountId = useWatch({ control, name: 'selectedSellAssetAccountId' })
  const selectedBuyAssetAccountId = useWatch({ control, name: 'selectedBuyAssetAccountId' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // Constants
  const sellAssetId = sellTradeAsset?.asset?.assetId
  const buyAssetId = buyTradeAsset?.asset?.assetId

  // Selectors
  const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId ?? ''))
  const buyAsset = useAppSelector(state => selectAssetById(state, buyAssetId ?? ''))
  const highestFiatBalanceSellAccountId = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: sellAssetId ?? '',
    }),
  )
  const highestFiatBalanceBuyAccount = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: buyAssetId ?? '',
    }),
  )
  const sellAssetAccountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, sellAsset?.chainId ?? ''),
  )
  const buyAssetAccountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, buyAsset?.chainId ?? ''),
  )

  // Set sellAssetAccountId
  useEffect(
    () =>
      setValue(
        'sellAssetAccountId',
        selectedSellAssetAccountId ?? highestFiatBalanceSellAccountId ?? sellAssetAccountSpecifier,
      ),
    [
      selectedSellAssetAccountId,
      highestFiatBalanceSellAccountId,
      setValue,
      sellTradeAsset,
      buyTradeAsset,
      sellAssetAccountSpecifier,
    ],
  )

  // Set buyAssetAccountId
  useEffect(
    () =>
      setValue(
        'buyAssetAccountId',
        selectedBuyAssetAccountId ?? highestFiatBalanceBuyAccount ?? buyAssetAccountSpecifier,
      ),
    [
      buyAssetAccountSpecifier,
      highestFiatBalanceBuyAccount,
      selectedBuyAssetAccountId,
      setValue,
      sellTradeAsset,
      buyTradeAsset,
    ],
  )
}
