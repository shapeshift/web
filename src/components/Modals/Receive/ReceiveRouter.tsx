import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Route, RouteComponentProps, Switch, useHistory, useLocation } from 'react-router-dom'
import { SelectAssets } from 'components/SelectAssets/SelectAssets'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

import { ReceiveRoutes } from './Receive'
import { ReceiveInfo } from './ReceiveInfo'

type ReceiveRouterProps = {
  asset?: AssetMarketData
}
export const ReceiveRouter = ({ asset }: ReceiveRouterProps) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>()
  const location = useLocation()
  const history = useHistory()

  const handleAssetSelect = async (asset: Asset) => {
    setSelectedAsset(asset)
    history.push(ReceiveRoutes.Info)
  }

  useEffect(() => {
    if (!selectedAsset && !asset) {
      history.push(ReceiveRoutes.Select)
    }
  }, [asset, history, selectedAsset])

  useEffect(() => {
    setSelectedAsset(asset)
  }, [asset])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path={ReceiveRoutes.Info}
          component={(props: RouteComponentProps) =>
            selectedAsset ? <ReceiveInfo asset={selectedAsset} {...props} /> : null
          }
        />
        <Route
          path={ReceiveRoutes.Select}
          component={(props: RouteComponentProps) => (
            <SelectAssets onClick={handleAssetSelect} {...props} />
          )}
        />
      </Switch>
    </AnimatePresence>
  )
}
