import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { ReceiveRoutes } from './ReceiveCommon'

import { ReceiveInfo } from '@/components/Modals/Receive/ReceiveInfo'
import { SelectAssetRouter } from '@/components/SelectAssets/SelectAssetRouter'
import { selectAssetById } from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type ReceiveRouterProps = {
  assetId?: AssetId
  accountId?: AccountId
}
export const ReceiveRouter: React.FC<ReceiveRouterProps> = ({ assetId, accountId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(asset)
  const location = useLocation()
  const navigate = useNavigate()

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      const _asset = selectAssetById(store.getState(), assetId)
      setSelectedAsset(_asset)
      navigate(ReceiveRoutes.Info)
    },
    [navigate],
  )

  useEffect(() => {
    if (!selectedAsset && !asset) {
      navigate(ReceiveRoutes.Select)
    } else if (asset) {
      setSelectedAsset(asset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Routes>
        <Route
          path={ReceiveRoutes.Info}
          element={
            selectedAsset ? <ReceiveInfo asset={selectedAsset} accountId={accountId} /> : null
          }
        />
        <Route
          path={ReceiveRoutes.Select}
          element={<SelectAssetRouter onClick={handleAssetSelect} />}
        />
      </Routes>
    </AnimatePresence>
  )
}
