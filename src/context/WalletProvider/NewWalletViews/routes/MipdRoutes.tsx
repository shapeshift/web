import { useMemo } from 'react'
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

  const coinbaseQrBodyElement = useMemo(
    () => (
      <CoinbaseQrBody
        isLoading={isLoading}
        error={error}
        setIsLoading={setIsLoading}
        setError={setError}
      />
    ),
    [isLoading, error, setIsLoading, setError],
  )

  const firstClassBodyElements = useMemo(
    () =>
      Object.values(RDNS_TO_FIRST_CLASS_KEYMANAGER).map(keyManager => (
        <Route
          key={keyManager}
          path={`/${keyManager.toLowerCase()}/connect`}
          // This is already within a useMemo call, lint rule drunk
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
      )),
    [isLoading, error, setIsLoading, setError],
  )

  const mipdBodyElement = useMemo(
    () =>
      modalType ? (
        <MipdBody
          rdns={modalType}
          isLoading={isLoading}
          error={error}
          setIsLoading={setIsLoading}
          setError={setError}
        />
      ) : null,
    [isLoading, error, setIsLoading, setError, modalType],
  )

  const snapInstallElement = useMemo(() => <SnapInstall />, [])
  const snapUpdateElement = useMemo(() => <SnapUpdate />, [])

  if (!modalType) return null

  return (
    <Routes>
      <Route path='/coinbase/connect' element={coinbaseQrBodyElement} />
      {firstClassBodyElements}
      <Route path='/metamask/connect' element={mipdBodyElement} />
      <Route path='/metamask/snap/install' element={snapInstallElement} />
      <Route path='/metamask/snap/update' element={snapUpdateElement} />
    </Routes>
  )
}
