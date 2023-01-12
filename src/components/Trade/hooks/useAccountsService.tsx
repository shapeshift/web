import { useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import type { TS } from 'components/Trade/types'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectHighestFiatBalanceAccountByAssetId } from 'state/slices/portfolioSlice/selectors'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
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
  const formSellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const formBuyAssetAccountId = useWatch({ control, name: 'buyAssetAccountId' })

  // Custom hooks
  const { swapperSupportsCrossAccountTrade, bestTradeSwapper } = useSwapper()

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
  const firstSellAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, sellAsset?.chainId ?? ''),
  )
  const firstBuyAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, buyAsset?.chainId ?? ''),
  )

  const sellAssetAccountId = useMemo(
    () => selectedSellAssetAccountId ?? highestFiatBalanceSellAccountId ?? firstSellAssetAccountId,
    [highestFiatBalanceSellAccountId, selectedSellAssetAccountId, firstSellAssetAccountId],
  )

  const buyAssetAccountId = useMemo(
    () => selectedBuyAssetAccountId ?? highestFiatBalanceBuyAccount ?? firstBuyAssetAccountId,
    [firstBuyAssetAccountId, highestFiatBalanceBuyAccount, selectedBuyAssetAccountId],
  )

  // Set sellAssetAccountId
  useEffect(
    () => setValue('sellAssetAccountId', sellAssetAccountId),
    // formSellAssetAccountId is important here as it ensures this useEffect re-runs when the form value is cleared
    [sellAssetAccountId, setValue, formSellAssetAccountId],
  )

  // Set buyAssetAccountId
  useEffect(() => {
    setValue(
      'buyAssetAccountId',
      /*
        This is extremely dangerous. We only want to do this if we have a swapper, and that swapper does not do either of:
          - Trades between assets on the same chain but different accounts
          - Trades between assets on different chains (and possibly different accounts)
       */
      swapperSupportsCrossAccountTrade || !bestTradeSwapper
        ? buyAssetAccountId
        : sellAssetAccountId,
    )
    // formBuyAssetAccountId is important here as it ensures this useEffect re-runs when the form value is cleared
  }, [
    buyAssetAccountId,
    sellAssetAccountId,
    setValue,
    swapperSupportsCrossAccountTrade,
    formBuyAssetAccountId,
    bestTradeSwapper,
  ])
}
