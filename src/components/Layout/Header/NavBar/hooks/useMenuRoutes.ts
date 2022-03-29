import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export enum WalletConnectedRoutes {
  Connected = '/connected',
  KeepKey = '/connected/keepkey',
  KeepKeyPin = '/connected/keepkey/pin',
  KeepKeyLabel = '/connected/keepkey/label',
  KeepKeyTimeout = '/connected/keepkey/timeout',
  KeepKeyPinCaching = '/connected/keepkey/pin-caching',
  KeepKeyPassphrase = '/connected/keepkey/passphrase'
}

export const useMenuRoutes = () => {
  const history = useHistory()
  const { reset } = useKeepKey()

  const handleBackClick = useCallback(() => history.goBack(), [history])
  const navigateToRoute = useCallback(
    (route: WalletConnectedRoutes) => {
      reset()
      history.push(route)
    },
    [history, reset]
  )

  return {
    handleBackClick,
    navigateToRoute
  }
}
