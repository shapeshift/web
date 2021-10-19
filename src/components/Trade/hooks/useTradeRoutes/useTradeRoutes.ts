import { Asset, NetworkTypes } from '@shapeshiftoss/types'
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
  const { getValues, setValue } = useFormContext<TradeState>()
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
        setValue('sellAsset.currency', sellAsset)
        setValue('buyAsset.currency', buyAsset)
        getQuote({ sellAmount: '0' }, { currency: sellAsset }, { currency: buyAsset })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [setValue, getQuote, getDefaultPair])

  useEffect(() => {
    setDefaultAssets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      if (getByIdentifier(asset) === getByIdentifier(buyAsset.currency))
        setValue('buyAsset.currency', sellAsset.currency)
      const action = buyAsset.amount ? TradeActions.BUY : undefined
      setValue('sellAsset.currency', asset)
      setValue('sellAsset.amount', '')
      setValue('action', action)
      setValue('quote', undefined)
      await getBestSwapper({ sellAsset, buyAsset })
      getQuote({ buyAmount: buyAsset.amount ?? '0' }, sellAsset, buyAsset)
      history.push('/trade/input')
    },
    [buyAsset, sellAsset, history, setValue, getBestSwapper, getQuote]
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      if (getByIdentifier(asset) === getByIdentifier(sellAsset.currency))
        setValue('sellAsset.currency', buyAsset.currency)
      const action = sellAsset.amount ? TradeActions.SELL : undefined
      setValue('buyAsset.currency', asset)
      setValue('buyAsset.amount', '')
      setValue('action', action)
      setValue('quote', undefined)
      await getBestSwapper({ sellAsset, buyAsset })
      getQuote({ sellAmount: sellAsset.amount ?? '0' }, sellAsset, buyAsset)
      history.push('/trade/input')
    },
    [buyAsset, sellAsset, history, setValue, getBestSwapper, getQuote]
  )

  return { handleSellClick, handleBuyClick }
}
