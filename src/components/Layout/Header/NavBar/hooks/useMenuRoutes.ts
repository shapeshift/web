import { useToast } from '@chakra-ui/react'
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
  KeepKeyPassphrase = '/keepkey/passphrase',
  Native = '/native',
}

export const useMenuRoutes = () => {
  const history = useHistory()
  const { keepKeyWallet } = useKeepKey()
  const { setDeviceState } = useWallet()
  const toast = useToast()
  const translate = useTranslate()

  const resetKeepKeyState = useCallback(async () => {
    if (keepKeyWallet) {
      await keepKeyWallet?.cancel().catch(e => {
        console.error(e)
        toast({
          title: translate('common.error'),
          description: e?.message ?? translate('common.somethingWentWrong'),
          status: 'error',
          isClosable: true,
        })
      })
      setDeviceState({
        lastDeviceInteractionStatus: undefined,
        awaitingDeviceInteraction: false,
      })
    }
  }, [keepKeyWallet, setDeviceState, toast, translate])

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
