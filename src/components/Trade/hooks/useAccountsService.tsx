import { useEffect, useMemo } from 'react'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectHighestFiatBalanceAccountByAssetId } from 'state/slices/portfolioSlice/selectors'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Accounts Service is responsible for reacting to changes to trade assets and selected accounts.
It sets sellAssetAccountId and buyAssetAccountId properties.
*/
export const useAccountsService = () => {
  const {
    dispatch: swapperDispatch,
    selectedSellAssetAccountId,
    selectedBuyAssetAccountId,
    sellAssetAccountId: stateSellAssetAccountId,
    buyAssetAccountId: stateBuyAssetAccountId,
  } = useSwapperState()
  const { sellTradeAsset, buyTradeAsset } = useSwapperState()

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
    () => swapperDispatch({ type: SwapperActionType.SET_VALUES, payload: { sellAssetAccountId } }),
    // formSellAssetAccountId is important here as it ensures this useEffect re-runs when the form value is cleared
    [sellAssetAccountId, stateSellAssetAccountId, swapperDispatch],
  )

  // Set buyAssetAccountId
  useEffect(() => {
    swapperDispatch({
      type: SwapperActionType.SET_VALUES,
      payload: {
        buyAssetAccountId:
          /*
            This is extremely dangerous. We only want to substitute the buyAssetAccountId with the sellAssetAccountId
            if we have a swapper, and that swapper does not do either of:
              - Trades between assets on the same chain but different accounts
              - Trades between assets on different chains (and possibly different accounts)
           */
          swapperSupportsCrossAccountTrade || !bestTradeSwapper
            ? buyAssetAccountId
            : sellAssetAccountId,
      },
    })
    // formBuyAssetAccountId is important here as it ensures this useEffect re-runs when the form value is cleared
  }, [
    buyAssetAccountId,
    sellAssetAccountId,
    swapperDispatch,
    swapperSupportsCrossAccountTrade,
    stateBuyAssetAccountId,
    bestTradeSwapper,
  ])
}
