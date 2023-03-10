import { useEffect, useMemo } from 'react'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectHighestFiatBalanceAccountByAssetId } from 'state/slices/portfolioSlice/selectors'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Accounts Service is responsible for reacting to changes to trade assets and selected accounts.
It sets sellAssetAccountId and buyAssetAccountId properties.
*/
export const useAccountsService = () => {
  const {
    dispatch: swapperDispatch,
    state: { sellTradeAsset, buyTradeAsset },
  } = useSwapperState()

  // Custom hooks
  const { swapperSupportsCrossAccountTrade, bestTradeSwapper } = useSwapper()
  const selectedSellAssetAccountId = useSwapperStore.use.selectedSellAssetAccountId?.()
  const selectedBuyAssetAccountId = useSwapperStore.use.selectedBuyAssetAccountId?.()
  const stateSellAssetAccountId = useSwapperStore.use.sellAssetAccountId?.()
  const stateBuyAssetAccountId = useSwapperStore.use.buyAssetAccountId?.()
  const updateBuyAssetAccountId = useSwapperStore.use.updateBuyAssetAccountId()
  const updateSellAssetAccountId = useSwapperStore.use.updateSellAssetAccountId()

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
    () => updateSellAssetAccountId(sellAssetAccountId),
    // stateSellAssetAccountId is important here as it ensures this useEffect re-runs when the form value is cleared
    [sellAssetAccountId, stateSellAssetAccountId, swapperDispatch, updateSellAssetAccountId],
  )

  // Set buyAssetAccountId
  useEffect(() => {
    /*
      This is extremely dangerous. We only want to substitute the buyAssetAccountId with the sellAssetAccountId
      if we have a swapper, and that swapper does not do either of:
        - Trades between assets on the same chain but different accounts
        - Trades between assets on different chains (and possibly different accounts)
    */
    const buyAssetAccountIdToSet =
      swapperSupportsCrossAccountTrade || !bestTradeSwapper ? buyAssetAccountId : sellAssetAccountId
    updateBuyAssetAccountId(buyAssetAccountIdToSet)
    // stateBuyAssetAccountId is important here as it ensures this useEffect re-runs when the form value is cleared
  }, [
    buyAssetAccountId,
    sellAssetAccountId,
    swapperDispatch,
    swapperSupportsCrossAccountTrade,
    stateBuyAssetAccountId,
    bestTradeSwapper,
    updateBuyAssetAccountId,
  ])
}
