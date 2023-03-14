import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on Swapper State's fees property.
*/
export const useFeesService = () => {
  // Selectors
  const bestTradeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const quote = useSwapperStore(state => state.quote)
  const updateFees = useSwapperStore(state => state.updateFees)
  const trade = useSwapperStore(state => state.trade)

  if (!sellFeeAsset) throw new Error(`Asset not found for AssetId ${sellAsset?.assetId}`)

  useEffect(() => {
    const feeTrade = trade ?? quote
    if (sellAsset && bestTradeSwapper && feeTrade) {
      const formFees = getFormFees({
        trade: feeTrade,
        sellAsset,
        tradeFeeSource: bestTradeSwapper.name,
        feeAsset: sellFeeAsset,
      })
      updateFees(formFees)
    }
  }, [bestTradeSwapper, quote, sellAsset, sellFeeAsset, trade, updateFees])
}
