import { Asset, ChainTypes, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { selectAssets } from 'state/slices/selectors'

import { TradeState } from '../../Trade'
import { TradeActions, useSwapper } from '../useSwapper/useSwapper'

export const useTradeRoutes = (): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<ChainTypes, SwapperType>>()
  const { getQuote, getBestSwapper, getDefaultPair } = useSwapper()
  const buyAsset = getValues('buyAsset')
  const sellAsset = getValues('sellAsset')
  const assets = useSelector(selectAssets)
  const feeAsset = assets['eip155:1/slip44:60']

  const setDefaultAssets = useCallback(async () => {
    try {
      const [sellAssetId, buyAssetId] = getDefaultPair()
      const sellAsset = assets[sellAssetId]
      const buyAsset = assets[buyAssetId]
      if (sellAsset && buyAsset) {
        await getBestSwapper({
          sellAsset: { currency: sellAsset },
          buyAsset: { currency: buyAsset }
        })
        setValue('sellAsset.currency', sellAsset)
        setValue('buyAsset.currency', buyAsset)
        getQuote({
          amount: '0',
          sellAsset: { currency: sellAsset },
          buyAsset: { currency: buyAsset },
          feeAsset
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [assets, setValue, feeAsset, getQuote, getDefaultPair, getBestSwapper])

  useEffect(() => {
    setDefaultAssets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        if (buyAsset.currency && asset.caip19 === buyAsset.currency.caip19)
          setValue('buyAsset.currency', sellAsset.currency)
        const action = buyAsset.amount ? TradeActions.SELL : undefined
        setValue('sellAsset.currency', asset)
        setValue('buyAsset.amount', '')
        setValue('action', action)
        setValue('quote', undefined)
        await getBestSwapper({ sellAsset, buyAsset })
        getQuote({
          amount: sellAsset.amount ?? '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyAsset, sellAsset, feeAsset, history, setValue, getBestSwapper, getQuote]
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        if (sellAsset.currency && asset.caip19 === sellAsset.currency.caip19)
          setValue('sellAsset.currency', buyAsset.currency)
        const action = sellAsset.amount ? TradeActions.BUY : undefined
        setValue('buyAsset.currency', asset)
        setValue('sellAsset.amount', '')
        setValue('action', action)
        setValue('quote', undefined)
        await getBestSwapper({ sellAsset, buyAsset })
        getQuote({
          amount: buyAsset.amount ?? '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyAsset, sellAsset, feeAsset, history, setValue, getBestSwapper, getQuote]
  )

  return { handleSellClick, handleBuyClick }
}
