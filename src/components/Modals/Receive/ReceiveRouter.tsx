import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

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
  const defaultAsset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const currentAsset = selectedAsset ?? defaultAsset

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      const _asset = selectAssetById(store.getState(), assetId)
      setSelectedAsset(_asset)
      navigate(ReceiveRoutes.Info)
    },
    [navigate],
  )

  const receiveInfoElement = useMemo(
    () =>
      currentAsset ? (
        <ReceiveInfo
          asset={currentAsset}
          accountId={accountId}
          onBack={selectedAsset !== undefined ? () => navigate(ReceiveRoutes.Select) : undefined}
        />
      ) : null,
    [currentAsset, accountId, selectedAsset, navigate],
  )

  const selectAssetRouterElement = useMemo(
    () => <SelectAssetRouter onClick={handleAssetSelect} />,
    [handleAssetSelect],
  )

  if (!currentAsset && pathname !== ReceiveRoutes.Select) {
    return <Navigate to={ReceiveRoutes.Select} />
  }

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Routes>
        <Route path={ReceiveRoutes.Info} element={receiveInfoElement} />
        <Route path={`${ReceiveRoutes.Select}/*`} element={selectAssetRouterElement} />
      </Routes>
    </AnimatePresence>
  )
}
