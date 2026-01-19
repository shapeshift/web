import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useLayoutEffect, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { TradingErrorBoundary } from '@/components/ErrorBoundary'
import { StandaloneMultiHopTrade } from '@/components/MultiHopTrade/StandaloneMultiHopTrade'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type SwapperModalContentProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
}

export const SwapperModalContent = memo(function SwapperModalContent({
  defaultBuyAssetId,
  defaultSellAssetId,
}: SwapperModalContentProps) {
  const methods = useForm({ mode: 'onChange' })
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const hasInitialized = useRef(false)

  const defaultBuyAsset = useAppSelector(state => selectAssetById(state, defaultBuyAssetId ?? ''))
  const defaultSellAsset = useAppSelector(state => selectAssetById(state, defaultSellAssetId ?? ''))

  useLayoutEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    dispatch(tradeInput.actions.clear())
    if (defaultBuyAsset) {
      dispatch(tradeInput.actions.setBuyAsset(defaultBuyAsset))
    }
    if (defaultSellAsset) {
      dispatch(tradeInput.actions.setSellAsset(defaultSellAsset))
    }
  }, [dispatch, defaultBuyAsset, defaultSellAsset])

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      if (newTab === TradeInputTab.Trade) {
        navigate(TradeRoutePaths.Input)
      }
    },
    [navigate],
  )

  return (
    <FormProvider {...methods}>
      <TradingErrorBoundary>
        <StandaloneMultiHopTrade
          defaultBuyAssetId={defaultBuyAssetId}
          defaultSellAssetId={defaultSellAssetId}
          onChangeTab={handleChangeTab}
          isStandalone
        />
      </TradingErrorBoundary>
    </FormProvider>
  )
})
