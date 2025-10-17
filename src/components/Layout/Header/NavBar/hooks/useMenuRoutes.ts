import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

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
  const navigate = useNavigate()
  const {
    state: { keepKeyWallet },
  } = useKeepKey()
  const { setDeviceState } = useWallet()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
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
    navigate(-1)
  }, [navigate, resetKeepKeyState])

  const navigateToRoute = useCallback(
    async (route: WalletConnectedRoutes) => {
      await resetKeepKeyState()
      navigate(route)
    },
    [navigate, resetKeepKeyState],
  )

  return {
    handleBackClick,
    navigateToRoute,
  }
}
