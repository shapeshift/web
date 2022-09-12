import type { Asset } from '@shapeshiftoss/asset-service'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveInfo } from './ReceiveInfo'

type ReceiveRouterProps = {
  asset?: Asset
}
export const ReceiveRouter = ({ asset }: ReceiveRouterProps) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(asset)
  const location = useLocation()
  const history = useHistory()

  const handleAssetSelect = async (asset: Asset) => {
    setSelectedAsset(asset)
    history.push(ReceiveRoutes.Info)
  }

  const handleSelectBack = () => {
    history.push(ReceiveRoutes.Info)
  }

  useEffect(() => {
    if (!selectedAsset && !asset) {
      history.push(ReceiveRoutes.Select)
    } else if (asset) {
      setSelectedAsset(asset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            <SelectAssetRouter onBack={handleSelectBack} onClick={handleAssetSelect} {...props} />
          )}
        />
      </Switch>
    </AnimatePresence>
  )
}
