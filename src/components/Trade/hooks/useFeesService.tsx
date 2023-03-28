import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'
import { selectQuote, selectSellAsset, selectTrade } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on Swapper State's fees property.
*/
export const useFeesService = () => {
  // Selectors
  const activeTradeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const activeQuote = useSwapperStore(selectQuote)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const updateFees = useSwapperStore(state => state.updateFees)
  const trade = useSwapperStore(selectTrade)

  if (!sellFeeAsset) throw new Error(`Asset not found for AssetId ${sellAsset?.assetId}`)

  useEffect(() => {
    const feeTrade = trade ?? activeQuote
    if (sellAsset && activeTradeSwapper && feeTrade) {
      const formFees = getFormFees({
        trade: feeTrade,
        sellAsset,
        tradeFeeSource: activeTradeSwapper.name,
        feeAsset: sellFeeAsset,
      })
      updateFees(formFees)
    }
  }, [activeTradeSwapper, activeQuote, sellAsset, sellFeeAsset, trade, updateFees])
}
