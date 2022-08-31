import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { Redirect, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'
import { Approval } from 'components/Approval/Approval'
import { SelectAccount } from 'components/Trade/SelectAccount'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { useSwapper } from '../hooks/useSwapper/useSwapperV2'
import { AssetClickAction, useTradeRoutes } from '../hooks/useTradeRoutes/useTradeRoutes'
import { SelectAsset } from '../SelectAsset'
import { TradeConfirm } from '../TradeConfirm/TradeConfirm'
import { TradeInput as TradeInputV1 } from '../TradeInput'
import { TradeInput as TradeInputV2 } from '../TradeInputV2'
import { TradeRoutePaths } from '../types'

export const entries = ['/send/details', '/send/confirm']

type TradeRoutesProps = {
  defaultBuyAssetId?: AssetId
}

export const TradeRoutes = ({ defaultBuyAssetId }: TradeRoutesProps) => {
  const location = useLocation()
  const { handleAssetClick } = useTradeRoutes(defaultBuyAssetId)
  const { getSupportedSellableAssets, getSupportedBuyAssetsFromSellAsset } = useSwapper()

  const isSwapperV2 = useFeatureFlag('SwapperV2')
  const TradeInputComponent = isSwapperV2 ? TradeInputV2 : TradeInputV1
  const handleAssetClickWithAction = (action: AssetClickAction) => (asset: Asset) =>
    handleAssetClick(asset, action)

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path={TradeRoutePaths.SellSelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleAssetClickWithAction(AssetClickAction.Sell)}
              filterBy={getSupportedSellableAssets}
              {...props}
            />
          )}
        />
        <Route
          path={TradeRoutePaths.BuySelect}
          render={(props: RouteComponentProps) => (
            <SelectAsset
              onClick={handleAssetClickWithAction(AssetClickAction.Buy)}
              filterBy={getSupportedBuyAssetsFromSellAsset}
              {...props}
            />
          )}
        />
        <Route path={TradeRoutePaths.Input} component={TradeInputComponent} />
        <Route path={TradeRoutePaths.Confirm} component={TradeConfirm} />
        <Route path={TradeRoutePaths.Approval} component={Approval} />
        <Route path={TradeRoutePaths.AccountSelect} component={SelectAccount} />
        <Redirect from='/' to={TradeRoutePaths.Input} />
      </Switch>
    </AnimatePresence>
  )
}
