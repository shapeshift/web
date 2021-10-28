import { Asset, ChainTypes, NetworkTypes, SwapperType } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { getAssetService } from 'lib/assetService'
import { getByIdentifier } from 'lib/math'

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

  const setDefaultAssets = useCallback(async () => {
    try {
      const defaultPair = getDefaultPair()
      const service = await getAssetService()
      const data = service?.byNetwork(NetworkTypes.MAINNET)
      const sellAsset = data.find(
        asset => getByIdentifier(defaultPair?.[0]) === getByIdentifier(asset)
      )
      const buyAsset = data.find(
        asset => getByIdentifier(defaultPair?.[1]) === getByIdentifier(asset)
      )
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
          buyAsset: { currency: buyAsset }
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [setValue, getQuote, getDefaultPair, getBestSwapper])

  useEffect(() => {
    setDefaultAssets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      if (buyAsset.currency && getByIdentifier(asset) === getByIdentifier(buyAsset.currency))
        setValue('buyAsset.currency', sellAsset.currency)
      const action = buyAsset.amount ? TradeActions.SELL : undefined
      setValue('sellAsset.currency', asset)
      setValue('buyAsset.amount', '')
      setValue('action', action)
      setValue('quote', undefined)
      await getBestSwapper({ sellAsset, buyAsset })
      getQuote({ amount: sellAsset.amount ?? '0', sellAsset, buyAsset, action })
      history.push('/trade/input')
    },
    [buyAsset, sellAsset, history, setValue, getBestSwapper, getQuote]
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      if (sellAsset.currency && getByIdentifier(asset) === getByIdentifier(sellAsset.currency))
        setValue('sellAsset.currency', buyAsset.currency)
      const action = sellAsset.amount ? TradeActions.BUY : undefined
      setValue('buyAsset.currency', asset)
      setValue('sellAsset.amount', '')
      setValue('action', action)
      setValue('quote', undefined)
      await getBestSwapper({ sellAsset, buyAsset })
      getQuote({ amount: buyAsset.amount ?? '0', sellAsset, buyAsset, action })
      history.push('/trade/input')
    },
    [buyAsset, sellAsset, history, setValue, getBestSwapper, getQuote]
  )

  return { handleSellClick, handleBuyClick }
}
