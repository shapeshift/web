import { useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import type { TS } from 'components/Trade/types'
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
  const { control, setValue } = useFormContext<TS>()
  const selectedSellAssetAccountId = useWatch({ control, name: 'selectedSellAssetAccountId' })
  const selectedBuyAssetAccountId = useWatch({ control, name: 'selectedBuyAssetAccountId' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // Custom hooks
  const { swapperSupportsCrossAccountTrade } = useSwapper()

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

  const sellAssetAccountId = useMemo(
    () =>
      selectedSellAssetAccountId ?? highestFiatBalanceSellAccountId ?? sellAssetAccountSpecifier,
    [highestFiatBalanceSellAccountId, selectedSellAssetAccountId, sellAssetAccountSpecifier],
  )

  const buyAssetAccountId = useMemo(
    () => selectedBuyAssetAccountId ?? highestFiatBalanceBuyAccount ?? buyAssetAccountSpecifier,
    [buyAssetAccountSpecifier, highestFiatBalanceBuyAccount, selectedBuyAssetAccountId],
  )

  // Set sellAssetAccountId
  useEffect(
    () => setValue('sellAssetAccountId', sellAssetAccountId),
    [sellAssetAccountId, setValue],
  )

  // Set buyAssetAccountId
  useEffect(() => {
    setValue(
      'buyAssetAccountId',
      // If the swapper does not support cross-account trades the buyAssetAccountId must match the sellAssetAccountId
      swapperSupportsCrossAccountTrade ? buyAssetAccountId : sellAssetAccountId,
    )
  }, [buyAssetAccountId, sellAssetAccountId, setValue, swapperSupportsCrossAccountTrade])
}
