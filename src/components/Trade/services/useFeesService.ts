import { ethAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { type TradeState } from 'components/Trade/types'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Fees Service is responsible for reacting to changes to quote and trades, and updating the fees accordingly.
The only mutation is on TradeState's fees property.
*/
export const useFeesService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const trade = useWatch({ control, name: 'trade' })
  const quote = useWatch({ control, name: 'quote' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })

  // Hooks
  const { bestTradeSwapper } = useSwapper()

  // Selectors
  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? ethAssetId),
  )

  // Constants
  const sellAsset = sellTradeAsset?.asset

  useEffect(() => {
    const feeTrade = trade ?? quote
    if (sellAsset && bestTradeSwapper && feeTrade) {
      const formFees = getFormFees({
        trade: feeTrade,
        sellAsset,
        tradeFeeSource: bestTradeSwapper.name,
        feeAsset: sellFeeAsset,
      })
      setValue('fees', formFees)
    }
  }, [bestTradeSwapper, quote, sellAsset, sellFeeAsset, setValue, trade])
}
