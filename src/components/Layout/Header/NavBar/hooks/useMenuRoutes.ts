import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

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
  const { keepKeyWallet } = useKeepKey()
  const { setLastDeviceInteractionStatus } = useWallet()

  const handleBackClick = useCallback(async () => {
    await keepKeyWallet?.cancel()
    setLastDeviceInteractionStatus(undefined)
    history.goBack()
  }, [history, keepKeyWallet, setLastDeviceInteractionStatus])

  const navigateToRoute = useCallback(
    async (route: WalletConnectedRoutes) => {
      await keepKeyWallet?.cancel()
      setLastDeviceInteractionStatus(undefined)
      history.push(route)
    },
    [history, keepKeyWallet, setLastDeviceInteractionStatus]
  )

  return {
    handleBackClick,
    navigateToRoute
  }
}
