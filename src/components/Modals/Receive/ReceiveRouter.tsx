import type { Asset } from '@keepkey/asset-service'
import type { AccountId } from '@keepkey/caip'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveInfo } from './ReceiveInfo'

type ReceiveRouterProps = {
  asset: Asset
  accountId?: AccountId
}
export const ReceiveRouter = ({ asset, accountId }: ReceiveRouterProps) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(asset)
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
            selectedAsset ? (
              <ReceiveInfo asset={selectedAsset} accountId={accountId} {...props} />
            ) : null
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
