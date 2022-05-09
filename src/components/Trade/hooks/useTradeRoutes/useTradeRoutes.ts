/* eslint-disable no-console */
import { Asset, ChainTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssets } from 'state/slices/selectors'

import { useSwapper } from '../useSwapper/useSwapper'

const ETHEREUM_CAIP19 = 'eip155:1/slip44:60'

export const useTradeRoutes = (): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<ChainTypes>>()
  const { updateQuote, getDefaultPair } = useSwapper()
  const buyTradeAsset = getValues('buyAsset')
  const sellTradeAsset = getValues('sellAsset')
  const assets = useSelector(selectAssets)
  const feeAsset = assets[ETHEREUM_CAIP19]

  const setDefaultAssets = useCallback(async () => {
    // wait for assets to be loaded
    if (isEmpty(assets) || !feeAsset) return

    try {
      const [sellAssetId, buyAssetId] = getDefaultPair()
      const sellAsset = assets[sellAssetId]
      const buyAsset = assets[buyAssetId]

      if (sellAsset && buyAsset) {
        setValue('buyAsset.asset', buyAsset)
        setValue('sellAsset.asset', sellAsset)
        updateQuote({
          forceQuote: true,
          amount: '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [assets, feeAsset, getDefaultPair, setValue, updateQuote])

  useEffect(() => {
    setDefaultAssets()
  }, [assets, feeAsset]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        // Handle scenario where same asset is selected
        const previousSellAsset = { ...getValues('sellAsset') }
        const previousBuyAsset = { ...getValues('buyAsset') }
        if (asset.assetId === previousBuyAsset?.asset.assetId) {
          setValue('sellAsset.asset', asset)
          setValue('buyAsset.asset', previousSellAsset.asset)
        }
        updateQuote({
          forceQuote: true,
          amount: bnOrZero(sellTradeAsset?.amount).toString(),
          sellAsset: asset,
          buyAsset: buyTradeAsset?.asset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [
      getValues,
      updateQuote,
      sellTradeAsset?.amount,
      buyTradeAsset?.asset,
      feeAsset,
      setValue,
      history,
    ],
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        // Handle scenario where same asset is selected
        const previousSellAsset = { ...getValues('sellAsset') }
        const previousBuyAsset = { ...getValues('buyAsset') }
        if (asset.assetId === previousSellAsset?.asset.assetId) {
          setValue('sellAsset.asset', previousBuyAsset.asset)
          setValue('buyAsset.asset', asset)
        }
        updateQuote({
          forceQuote: true,
          amount: bnOrZero(buyTradeAsset?.amount).toString(),
          sellAsset: sellTradeAsset?.asset,
          buyAsset: asset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [getValues, buyTradeAsset, sellTradeAsset, updateQuote, feeAsset, setValue, history],
  )

  return { handleSellClick, handleBuyClick }
}
