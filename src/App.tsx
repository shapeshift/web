import { Alert, AlertDescription } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import type { ToastId } from '@chakra-ui/toast'
import { useToast } from '@chakra-ui/toast'
import { ipcRenderer } from 'electron'
import { useEffect, useRef } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Routes } from 'Routes/Routes'
import { IconCircle } from 'components/IconCircle'
import type { PairingProps } from 'components/Modals/Pair/Pair'
import { WalletActions } from 'context/WalletProvider/actions'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

export const App = () => {
  const {
    state: { deviceId },
    dispatch,
  } = useWallet()
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const { needsReset, setNeedsReset, setIsUpdatingKeepkey, state } = useWallet()

  const { pair, sign, hardwareError, updateKeepKey, requestBootloaderMode, loading } =
    useModal()

  const openKeepKeyUpdater = (data: any) => {
    setIsUpdatingKeepkey(true)
    requestBootloaderMode.close()
    updateKeepKey.open(data)
  }

  const closeAllModals = () => {
    updateKeepKey.close()
    loading.close()
    requestBootloaderMode.close()
    hardwareError.close()
    pair.close()
    sign.close()
  }

  useEffect(() => {
    // This is necessary so when it re-opens the tcp connection everything is good
    state.wallet?.disconnect()
    if (needsReset) hardwareError.open({})
    else hardwareError.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsReset])

  useEffect(() => {
    // This is necessary so when it re-opens the tcp connection everything is good
    state.wallet?.disconnect()

    ipcRenderer.on('plugin', () => {
      loading.open({})
      hardwareError.close()
    })

    ipcRenderer.on('hardwareError', () => {
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      hardwareError.open({})
      loading.close()
    })

    ipcRenderer.on('disconnected', () => {
      console.log('ipc disco')
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      closeAllModals()
      hardwareError.open({})
    })

    ipcRenderer.on('@modal/pair', (_event, data: PairingProps) => {
      // pair.open(data)
    })

    ipcRenderer.on('needsInitialize', (_event, data) => {
      closeAllModals()
      setIsUpdatingKeepkey(true)
      setNeedsReset(false)
      updateKeepKey.open(data)
    })

    ipcRenderer.on('requestBootloaderMode', () => {
      setIsUpdatingKeepkey(true)
      setNeedsReset(false)
      requestBootloaderMode.open({})
    })

    ipcRenderer.on('updateBootloader', (_event, data) => {
      setNeedsReset(false)
      openKeepKeyUpdater(data)
    })

    ipcRenderer.on('updateFirmware', (_event, data) => {
      openKeepKeyUpdater(data)
    })

    ipcRenderer.on('@modal/pin', (_event, _data) => {
      dispatch({
        type: WalletActions.OPEN_KEEPKEY_PIN,
        payload: {
          deviceId,
          showBackButton: false,
        },
      })
    })

    ipcRenderer.on('@account/sign-tx', async (_event: any, data: any) => {
      let unsignedTx = data.payload.data
      //open signTx
      if (
        unsignedTx &&
        unsignedTx.invocation &&
        unsignedTx.invocation.unsignedTx &&
        unsignedTx.invocation.unsignedTx.HDwalletPayload
      ) {
        sign.open({ unsignedTx, nonce: data.nonce })
      } else {
        // eslint-disable-next-line @keepkey/logger/no-native-console
        console.error('INVALID SIGN PAYLOAD!', JSON.stringify(unsignedTx))
      }
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    logger.debug({ shouldUpdate, updateId }, 'Update Check')
    if (shouldUpdate && !toast.isActive(updateId)) {
      const toastId = toast({
        render: () => {
          return (
            <Alert status='info' variant='update-box' borderRadius='lg'>
              <IconCircle boxSize={8} color='gray.500'>
                <FaSync />
              </IconCircle>
              <AlertDescription ml={3}>{translate('updateToast.body')}</AlertDescription>

              <Button colorScheme='blue' size='sm' onClick={() => window.location.reload()} ml={4}>
                {translate('updateToast.cta')}
              </Button>
            </Alert>
          )
        },
        id: updateId,
        duration: null,
        isClosable: false,
        position: 'bottom-right',
      })
      if (!toastId) return
      toastIdRef.current = toastId
    }
  }, [shouldUpdate, toast, translate])
  return <Routes />
}
