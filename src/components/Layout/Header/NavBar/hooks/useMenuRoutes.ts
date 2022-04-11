import { useToast } from '@chakra-ui/toast'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

export enum WalletConnectedRoutes {
  Connected = '/connected',
  KeepKey = '/keepkey',
  KeepKeyPin = '/keepkey/pin',
  KeepKeyLabel = '/keepkey/label',
  KeepKeyTimeout = '/keepkey/timeout',
  KeepKeyPinCaching = '/keepkey/pin-caching',
  KeepKeyPassphrase = '/keepkey/passphrase',
}

export const useMenuRoutes = () => {
  const history = useHistory()
  const { keepKeyWallet } = useKeepKey()
  const { setLastDeviceInteractionStatus, setAwaitingDeviceInteraction } = useWallet()
  const toast = useToast()
  const translate = useTranslate()

  const resetKeepKeyState = useCallback(async () => {
    await keepKeyWallet?.cancel().catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
    setLastDeviceInteractionStatus(undefined)
    setAwaitingDeviceInteraction(false)
  }, [
    keepKeyWallet,
    setAwaitingDeviceInteraction,
    setLastDeviceInteractionStatus,
    toast,
    translate,
  ])

  const handleBackClick = useCallback(async () => {
    await resetKeepKeyState()
    history.goBack()
  }, [history, resetKeepKeyState])

  const navigateToRoute = useCallback(
    async (route: WalletConnectedRoutes) => {
      await resetKeepKeyState()
      history.push(route)
    },
    [history, resetKeepKeyState],
  )

  return {
    handleBackClick,
    navigateToRoute,
  }
}
