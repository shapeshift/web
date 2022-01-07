import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Route, RouteComponentProps, Routes, useNavigate, useLocation } from 'react-router-dom'
import { SelectAssets } from 'components/SelectAssets/SelectAssets'

import { ReceiveRoutes } from './Receive'
import { ReceiveInfo } from './ReceiveInfo'

type ReceiveRouterProps = {
  asset?: Asset
}
export const ReceiveRouter = ({ asset }: ReceiveRouterProps) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>()
  const location = useLocation()
  const navigate = useNavigate()

  const handleAssetSelect = async (asset: Asset) => {
    setSelectedAsset(asset)
    navigate(ReceiveRoutes.Info)
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
      <Routes location={location} key={location.key}>
        <Route
          path={ReceiveRoutes.Info}
          element={(props: RouteComponentProps) =>
            selectedAsset ? <ReceiveInfo asset={selectedAsset} {...props} /> : null
          }
        />
        <Route
          path={ReceiveRoutes.Select}
          element={(props: RouteComponentProps) => (
            <SelectAssets onClick={handleAssetSelect} {...props} />
          )}
        />
      </Routes>
    </AnimatePresence>
  )
}
