import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'
import type { TS } from 'components/Trade/types'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on TradeState's fees property.
*/
export const useFeesService = () => {
  // Form hooks
  const { control } = useFormContext<TS>()
  const trade = useWatch({ control, name: 'trade' })
  const { quote } = useSwapperState()
  const { dispatch: swapperDispatch, sellTradeAsset } = useSwapperState()

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
