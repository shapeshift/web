import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useAssets } from 'context/AssetProvider/AssetProvider'
import { TradeActions, useSwapper } from 'hooks/useSwapper/useSwapper'
import { getByIdentifier } from 'lib/math'

import { TradeState } from '../Trade'

export const useTradeRoutes = (): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState>()
  const { getCryptoQuote, getBestSwapper, getDefaultPair } = useSwapper()
  const buyAsset = getValues('buyAsset')
  const sellAsset = getValues('sellAsset')
  const assetService = useAssets()
  const setDefaultAssets = useCallback(async () => {
    const defaultPair = getDefaultPair()
    const data = assetService.byNetwork(NetworkTypes.MAINNET)
    const sellAsset = data.find(
      asset => getByIdentifier(defaultPair?.[0]) === getByIdentifier(asset)
    )
    const buyAsset = data.find(
      asset => getByIdentifier(defaultPair?.[1]) === getByIdentifier(asset)
    )
    if (sellAsset && buyAsset) {
      setValue('sellAsset.currency', sellAsset)
      setValue('buyAsset.currency', buyAsset)
      getCryptoQuote({ sellAmount: '0' }, { currency: sellAsset }, { currency: buyAsset })
    }
  }, [setValue, getCryptoQuote, assetService, getDefaultPair])

  useEffect(() => {
    setDefaultAssets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      const action = TradeActions.SELL
      if (asset === buyAsset.currency) setValue('buyAsset.currency', sellAsset.currency)
      setValue('sellAsset.currency', asset)
      setValue('action', action)
      await getBestSwapper({ sellAsset, buyAsset })
      getCryptoQuote({ sellAmount: sellAsset.amount }, sellAsset, buyAsset, action)
      history.push('/trade/input')
    },
    [buyAsset, sellAsset, history, setValue, getBestSwapper, getCryptoQuote]
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      const action = TradeActions.BUY
      if (asset === sellAsset.currency) setValue('sellAsset.currency', buyAsset.currency)
      setValue('buyAsset.currency', asset)
      setValue('action', action)
      await getBestSwapper({ sellAsset, buyAsset })
      getCryptoQuote({ buyAmount: buyAsset.amount }, sellAsset, buyAsset, action)
      history.push('/trade/input')
    },
    [buyAsset, sellAsset, history, setValue, getBestSwapper, getCryptoQuote]
  )

  return { handleSellClick, handleBuyClick }
}
