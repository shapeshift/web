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
  const { keepKeyWallet, reset } = useKeepKey()

  const handleBackClick = useCallback(async () => {
    await keepKeyWallet?.cancel()
    reset()
    history.goBack()
  }, [history, keepKeyWallet, reset])

  const navigateToRoute = useCallback(
    async (route: WalletConnectedRoutes) => {
      await keepKeyWallet?.cancel()
      reset()
      history.push(route)
    },
    [history, keepKeyWallet, reset]
  )

  return {
    handleBackClick,
    navigateToRoute
  }
}
