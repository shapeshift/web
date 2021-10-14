import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Redirect, Route, RouteProps, Switch, useHistory, useLocation } from 'react-router-dom'
import { useAssets } from 'context/AssetProvider/AssetProvider'
import { TradeActions, useSwapper } from 'hooks/useSwapper/useSwapper'
import { getByIdentifier } from 'lib/math'

import { SelectAsset } from '../SelectAsset'
import { TradeState } from '../Trade'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput } from '../TradeInput'

export const entries = ['/send/details', '/send/confirm']

export const TradeRoutes = () => {
  const location = useLocation()
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState>()
  const { getCryptoQuote, getBestSwapper, getDefaultPair } = useSwapper()
  const buyAsset = getValues('buyAsset')
  const sellAsset = getValues('sellAsset')
  const assetService = useAssets()

  const setDefaultAssets = useCallback(async () => {
    try {
      const defaultPair = getDefaultPair()
      const data = assetService.byNetwork(NetworkTypes.MAINNET)
      const sellAsset = data.find(
        asset => getByIdentifier(defaultPair[0]) === getByIdentifier(asset)
      )
      const buyAsset = data.find(asset => defaultPair[1]?.symbol === asset.symbol)
      if (sellAsset && buyAsset) {
        setValue('sellAsset.currency', sellAsset)
        setValue('buyAsset.currency', buyAsset)
        getCryptoQuote({ sellAmount: '0' }, { currency: sellAsset }, { currency: buyAsset })
      }
    } catch (e) {
      console.warn(e)
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

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path='/trade/select/sell'
          component={(props: RouteProps) => <SelectAsset onClick={handleSellClick} {...props} />}
        />
        <Route
          path='/trade/select/buy'
          component={(props: RouteProps) => <SelectAsset onClick={handleBuyClick} {...props} />}
        />
        <Route path='/trade/input' component={TradeInput} />
        <Route path='/trade/confirm' component={TradeConfirm} />
        <Redirect from='/' to='/trade/input' />
      </Switch>
    </AnimatePresence>
  )
}
