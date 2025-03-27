import { Route, Routes } from 'react-router-dom'

import { SnapInstall } from '../../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../../MetaMask/components/SnapUpdate'
import { RDNS_TO_FIRST_CLASS_KEYMANAGER } from '../constants'
import type { RightPanelContentProps } from '../types'
import { CoinbaseQrBody } from '../wallets/mipd/CoinbaseQrBody'
import { FirstClassBody } from '../wallets/mipd/FirstClassBody'
import { MipdBody } from '../wallets/mipd/MipdBody'

import { useWallet } from '@/hooks/useWallet/useWallet'

export const MipdRoutes = ({
  isLoading,
  error,
  setIsLoading,
  setError,
}: Omit<RightPanelContentProps, 'location'>) => {
  const {
    state: { modalType },
  } = useWallet()

  if (!modalType) return null

  return (
    <Routes>
      <Route
        path='/coinbase/connect'
        element={
          <CoinbaseQrBody
            isLoading={isLoading}
            error={error}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        }
      />
      {Object.values(RDNS_TO_FIRST_CLASS_KEYMANAGER).map(keyManager => (
        <Route
          key={keyManager}
          path={`/${keyManager.toLowerCase()}/connect`}
          element={
            <FirstClassBody
              keyManager={keyManager}
              isLoading={isLoading}
              error={error}
              setIsLoading={setIsLoading}
              setError={setError}
            />
          }
        />
      ))}
      <Route
        path='/metamask/connect'
        element={
          <MipdBody
            rdns={modalType}
            isLoading={isLoading}
            error={error}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        }
      />
      <Route path='/metamask/snap/install' element={<SnapInstall />} />
      <Route path='/metamask/snap/update' element={<SnapUpdate />} />
    </Routes>
  )
}
