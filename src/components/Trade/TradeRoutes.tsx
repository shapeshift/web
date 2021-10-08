import { Asset, Quote } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useSwapper } from 'hooks/useSwapper/useSwapper'
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
  const { getBuyAssetQuote, getSellAssetQuote, getBestSwapper } = useSwapper({
    setValue,
    ...(watch() as TradeState)
  })

  const handleSellClick = async (asset: Asset) => {
    const buyAsset = getValues('buyAsset.currency')
    if (asset === buyAsset) setValue('buyAsset.currency', getValues('sellAsset.currency'))
    setValue('sellAsset.currency', asset)
    await getBestSwapper()
    getSellAssetQuote()
    history.push('/trade/input')
  }

  const handleBuyClick = async (asset: Asset) => {
    const sellAsset = getValues('sellAsset.currency')
    if (asset === sellAsset) setValue('sellAsset.currency', getValues('buyAsset.currency'))
    setValue('buyAsset.currency', asset)
    await getBestSwapper()
    getBuyAssetQuote()
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
