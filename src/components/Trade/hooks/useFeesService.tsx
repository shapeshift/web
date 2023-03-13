import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on Swapper State's fees property.
*/
export const useFeesService = () => {
  // Hooks
  const { bestTradeSwapper } = useSwapper()

  // Selectors
  const sellTradeAsset = useSwapperStore(state => state.sellTradeAsset)
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? ethAssetId),
  )
  const quote = useSwapperStore(state => state.quote)
  const updateFees = useSwapperStore(state => state.updateFees)
  const trade = useSwapperStore(state => state.trade)

  if (!sellFeeAsset)
    throw new Error(`Asset not found for AssetId ${sellTradeAsset?.asset?.assetId}`)

  useEffect(() => {
    const feeTrade = trade ?? quote
    if (sellTradeAsset?.asset && bestTradeSwapper && feeTrade) {
      const formFees = getFormFees({
        trade: feeTrade,
        sellAsset: sellTradeAsset?.asset,
        tradeFeeSource: bestTradeSwapper.name,
        feeAsset: sellFeeAsset,
      })
      updateFees(formFees)
    }
  }, [bestTradeSwapper, quote, sellTradeAsset?.asset, sellFeeAsset, trade, updateFees])
}
