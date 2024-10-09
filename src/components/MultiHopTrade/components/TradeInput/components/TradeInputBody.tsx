import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { selectInputBuyAsset, selectInputSellAsset } from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'

type TradeInputBodyProps = {
  isLoading: boolean | undefined
  manualReceiveAddress: string | undefined
  initialSellAssetAccountId: AccountId | undefined
  initialBuyAssetAccountId: AccountId | undefined
  setSellAssetAccountId: (accountId: AccountId) => void
  setBuyAssetAccountId: (accountId: AccountId) => void
}

export const TradeInputBody = ({
  isLoading,
  manualReceiveAddress,
  initialSellAssetAccountId,
  initialBuyAssetAccountId,
  setSellAssetAccountId,
  setBuyAssetAccountId,
}: TradeInputBodyProps) => {
  const dispatch = useAppDispatch()

  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const activeQuote = useAppSelector(selectActiveQuote)

  const setBuyAsset = useCallback(
    (asset: Asset) => dispatch(tradeInput.actions.setBuyAsset(asset)),
    [dispatch],
  )
  const setSellAsset = useCallback(
    (asset: Asset) => dispatch(tradeInput.actions.setSellAsset(asset)),
    [dispatch],
  )
  const handleSwitchAssets = useCallback(
    () => dispatch(tradeInput.actions.switchAssets()),
    [dispatch],
  )

  return (
    <SharedTradeInputBody
      activeQuote={activeQuote}
      buyAmountAfterFeesCryptoPrecision={buyAmountAfterFeesCryptoPrecision}
      buyAmountAfterFeesUserCurrency={buyAmountAfterFeesUserCurrency}
      buyAsset={buyAsset}
      sellAsset={sellAsset}
      isLoading={isLoading}
      manualReceiveAddress={manualReceiveAddress}
      initialSellAssetAccountId={initialSellAssetAccountId}
      initialBuyAssetAccountId={initialBuyAssetAccountId}
      setSellAssetAccountId={setSellAssetAccountId}
      setBuyAssetAccountId={setBuyAssetAccountId}
      setBuyAsset={setBuyAsset}
      setSellAsset={setSellAsset}
      handleSwitchAssets={handleSwitchAssets}
    />
  )
}
