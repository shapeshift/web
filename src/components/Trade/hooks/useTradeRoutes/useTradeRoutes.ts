import { Asset, ChainTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssets } from 'state/slices/selectors'

import { TradeState } from '../../Trade'
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
        setValue('sellAsset.asset', sellAsset)
        setValue('buyAsset.asset', buyAsset)
        updateQuote({
          initialQuote: true,
          amount: '0',
          sellAsset: sellTradeAsset.asset,
          buyAsset: buyTradeAsset.asset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [assets, feeAsset, getDefaultPair, setValue, updateQuote, sellTradeAsset, buyTradeAsset])

  useEffect(() => {
    setDefaultAssets()
  }, [assets, feeAsset]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        setValue('sellAsset.asset', asset)
        setValue('buyAsset.amount', '')
        setValue('quote', undefined)
        updateQuote({
          amount: bnOrZero(sellTradeAsset.amount).toString(),
          sellAsset: sellTradeAsset.asset,
          buyAsset: buyTradeAsset.asset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyTradeAsset, sellTradeAsset, feeAsset, history, setValue, updateQuote],
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        setValue('buyAsset.asset', asset)
        setValue('sellAsset.amount', '')
        setValue('quote', undefined)
        updateQuote({
          amount: bnOrZero(buyTradeAsset.amount).toString(),
          sellAsset: sellTradeAsset.asset,
          buyAsset: buyTradeAsset.asset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [setValue, updateQuote, buyTradeAsset, sellTradeAsset, feeAsset, history],
  )

  return { handleSellClick, handleBuyClick }
}
