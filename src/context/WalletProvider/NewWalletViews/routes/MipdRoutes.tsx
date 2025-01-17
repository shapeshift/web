import { Route, Switch } from 'react-router-dom'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SnapInstall } from '../../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../../MetaMask/components/SnapUpdate'
import type { RightPanelContentProps } from '../types'
import { MipdBody } from '../wallets/mipd/MipdBody'

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
    <Switch>
      <Route exact path='/metamask/connect'>
        <MipdBody
          rdns={modalType}
          isLoading={isLoading}
          error={error}
          setIsLoading={setIsLoading}
          setError={setError}
        />
      </Route>
      <Route path='/metamask/snap/install'>
        <SnapInstall />
      </Route>
      <Route path='/metamask/snap/update'>
        <SnapUpdate />
      </Route>
    </Switch>
  )
}
