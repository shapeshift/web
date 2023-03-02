import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on Swapper State's fees property.
*/
export const useFeesService = () => {
  const {
    dispatch: swapperDispatch,
    state: { sellTradeAsset, quote, trade },
  } = useSwapperState()

  // Hooks
  const { bestTradeSwapper } = useSwapper()

  // Selectors
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? ethAssetId),
  )

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
      swapperDispatch({ type: SwapperActionType.SET_VALUES, payload: { fees: formFees } })
    }
  }, [bestTradeSwapper, quote, sellTradeAsset?.asset, sellFeeAsset, trade, swapperDispatch])
}
