import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { ReceiveInfo } from 'components/Modals/Receive/ReceiveInfo'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import type { Asset } from 'lib/asset-service'
import { selectAssetById } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { ReceiveRoutes } from './ReceiveCommon'

type ReceiveRouterProps = {
  assetId?: AssetId
  accountId?: AccountId
}
export const ReceiveRouter = ({ assetId, accountId }: ReceiveRouterProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(asset)
  const location = useLocation()
  const history = useHistory()

  const handleAssetSelect = (assetId: AssetId) => {
    const _asset = selectAssetById(store.getState(), assetId)
    setSelectedAsset(_asset)
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
        <Route path={ReceiveRoutes.Info}>
          {selectedAsset ? <ReceiveInfo asset={selectedAsset} accountId={accountId} /> : null}
        </Route>
        <Route path={ReceiveRoutes.Select}>
          <SelectAssetRouter onBack={handleSelectBack} onClick={handleAssetSelect} />
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
