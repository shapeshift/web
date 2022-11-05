import { ethAssetId } from '@keepkey/caip'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import type { TS } from 'components/Trade/types'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on TradeState's fees property.
*/
export const useFeesService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const trade = useWatch({ control, name: 'trade' })
  const quote = useWatch({ control, name: 'quote' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })

  // Hooks
  const { bestTradeSwapper } = useSwapper()

  // Selectors
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? ethAssetId),
  )

  useEffect(() => {
    const feeTrade = trade ?? quote
    if (sellTradeAsset?.asset && bestTradeSwapper && feeTrade) {
      const formFees = getFormFees({
        trade: feeTrade,
        sellAsset: sellTradeAsset?.asset,
        tradeFeeSource: bestTradeSwapper.name,
        feeAsset: sellFeeAsset,
      })
      setValue('fees', formFees)
    }
  }, [bestTradeSwapper, quote, sellTradeAsset?.asset, sellFeeAsset, setValue, trade])
}
