import { Asset, NetworkTypes, SwapperType } from '@shapeshiftoss/types'
import { useAssets } from 'context/AssetProvider/AssetProvider'
import { AnimatePresence } from 'framer-motion'
import { useSwapper } from 'hooks/useSwapper/useSwapper'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Redirect, Route, RouteProps, Switch, useHistory, useLocation } from 'react-router-dom'
import { SelectAsset } from './SelectAsset'
import { TradeState } from './Trade'
import { TradeConfirm } from './TradeConfirm/TradeConfirm'
import { TradeInput } from './TradeInput'

export const entries = ['/send/details', '/send/confirm']

export const TradeRoutes = () => {
  const location = useLocation()
  const history = useHistory()
  const { getValues, setValue, watch } = useFormContext()
  const { getCryptoQuote, getBestSwapper, getDefaultPair } = useSwapper({
    setValue,
    ...(watch() as TradeState)
  })

  const assetService = useAssets()

  const setDefaultAssets = async () => {
    try {
      const defaultPair = getDefaultPair()
      const data = assetService.byNetwork(NetworkTypes.MAINNET)
      const sellAsset = data.find(asset => defaultPair[0]?.symbol === asset.symbol)
      const buyAsset = data.find(asset => defaultPair[1]?.symbol === asset.symbol)
      setValue('sellAsset.currency', sellAsset)
      setValue('buyAsset.currency', buyAsset)
    } catch (e) {
      console.warn(e)
    }
  }

  useEffect(() => {
    setDefaultAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSellClick = async (asset: Asset) => {
    const buyAsset = getValues('buyAsset')
    const sellAsset = getValues('sellAsset')
    if (asset === buyAsset.currency) setValue('buyAsset.currency', getValues('sellAsset.currency'))
    setValue('sellAsset.currency', asset)
    await getBestSwapper({ sellAsset, buyAsset })
    getCryptoQuote({ sellAmount: sellAsset.amount }, sellAsset, buyAsset)
    history.push('/trade/input')
  }

  const handleBuyClick = async (asset: Asset) => {
    const sellAsset = getValues('sellAsset')
    const buyAsset = getValues('buyAsset')
    if (asset === sellAsset.currency) setValue('sellAsset.currency', getValues('buyAsset.currency'))
    setValue('buyAsset.currency', asset)
    await getBestSwapper({ sellAsset, buyAsset })
    getCryptoQuote({ buyAmount: buyAsset.amount }, sellAsset, buyAsset)
    history.push('/trade/input')
  }

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
