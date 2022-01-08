import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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
      navigate(ReceiveRoutes.Select)
    }
  }, [asset, navigate, selectedAsset])

  useEffect(() => {
    setSelectedAsset(asset)
  }, [asset])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Routes location={location} key={location.key}>
        <Route
          path={ReceiveRoutes.Info}
          element={() => (selectedAsset ? <ReceiveInfo asset={selectedAsset} /> : null)}
        />
        <Route
          path={ReceiveRoutes.Select}
          element={() => <SelectAssets onClick={handleAssetSelect} />}
        />
      </Routes>
    </AnimatePresence>
  )
}
