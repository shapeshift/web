import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'
import { selectSellAsset, selectTrade } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on Swapper State's fees property.
*/
export const useFeesService = () => {
  // Selectors
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellAsset?.assetId ?? ethAssetId),
  )
  const updateFees = useSwapperStore(state => state.updateFees)
  const trade = useSwapperStore(selectTrade)

  useEffect(() => {
    sellFeeAsset && updateFees(sellFeeAsset)
  }, [updateFees, trade, sellFeeAsset, sellAsset?.assetId])
}
