import { Route, Switch } from 'react-router-dom'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SnapInstall } from '../../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../../MetaMask/components/SnapUpdate'
import { RDNS_TO_FIRST_CLASS_KEYMANAGER } from '../constants'
import type { RightPanelContentProps } from '../types'
import { CoinbaseQrBody } from '../wallets/mipd/CoinbaseQrBody'
import { FirstClassBody } from '../wallets/mipd/FirstClassBody'
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
      <Route exact path='/coinbase/connect'>
        <CoinbaseQrBody
          isLoading={isLoading}
          error={error}
          setIsLoading={setIsLoading}
          setError={setError}
        />
      </Route>
      {Object.values(RDNS_TO_FIRST_CLASS_KEYMANAGER).map(keyManager => (
        <Route key={keyManager} exact path={`/${keyManager.toLowerCase()}/connect`}>
          <FirstClassBody
            keyManager={keyManager}
            isLoading={isLoading}
            error={error}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        </Route>
      ))}
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
