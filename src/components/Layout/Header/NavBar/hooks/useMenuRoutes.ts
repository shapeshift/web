import { useToast } from '@chakra-ui/toast'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

export enum WalletConnectedRoutes {
  Connected = '/connected',
  KeepKey = '/keepkey',
  KeepKeyPin = '/keepkey/pin',
  KeepKeyLabel = '/keepkey/label',
  KeepKeyTimeout = '/keepkey/timeout',
  KeepKeyPassphrase = '/keepkey/passphrase',
  Native = '/native',
}

const moduleLogger = logger.child({ namespace: ['useMenuRoutes'] })

export const useMenuRoutes = () => {
  const history = useHistory()
  const { keepKeyWallet } = useKeepKey()
  const { setDeviceState } = useWallet()
  const toast = useToast()
  const translate = useTranslate()

  const resetKeepKeyState = useCallback(async () => {
    if (keepKeyWallet) {
      moduleLogger.trace({ fn: 'resetKeepKeyState' }, 'Cancelling KeepKey...')
      await keepKeyWallet?.cancel().catch(e => {
        moduleLogger.error(e, { fn: 'resetKeepKeyState' }, 'Error on KeepKey Cancel')
        toast({
          title: translate('common.error'),
          description: e?.message ?? translate('common.somethingWentWrong'),
          status: 'error',
          isClosable: true,
        })
      })
      moduleLogger.trace({ fn: 'resetKeepKeyState' }, 'KeepKey is now available')
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
