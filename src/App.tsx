import { Alert, AlertDescription } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import type { ToastId } from '@chakra-ui/toast'
import { useToast } from '@chakra-ui/toast'
import { ipcRenderer } from 'electron'
import { useEffect, useRef } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Routes } from 'Routes/Routes'
import { IconCircle } from 'components/IconCircle'
import type { PairingProps } from 'components/Modals/Pair/Pair'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectShowWelcomeModal } from 'state/slices/selectors'

export const App = () => {
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const showWelcomeModal = useSelector(selectShowWelcomeModal)
  const {
    mobileWelcomeModal: { isOpen: isWelcomeModalOpen, open: openWelcomeModal },
  } = useModal()

  const { needsReset } = useWallet()

  const { pair, sign, hardwareError, updateBootloader, updateFirmware, requestBootloaderMode } =
    useModal()

  useEffect(() => {
    if (needsReset) hardwareError.open({})
    else hardwareError.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsReset])

  useEffect(() => {
    ipcRenderer.on('@modal/pair', (_event, data: PairingProps) => {
      pair.open(data)
    })

    ipcRenderer.on('requestBootloaderMode', () => {
      console.log('now requesting bootloader mode')
      requestBootloaderMode.open({})
    })

    ipcRenderer.on('updateBootloader', () => {
      console.log('now updating bootloader')
      updateBootloader.open({})
    })

    ipcRenderer.on('updateFirmware', () => {
      console.log('now updating firmware')
      updateFirmware.open({})
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // eslint-disable-next-line @shapeshiftoss/logger/no-native-console
      console.error('INVALID SIGN PAYLOAD!', JSON.stringify(unsignedTx))
    }
  })

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

  useEffect(() => {
    if (showWelcomeModal && !isWelcomeModalOpen) {
      openWelcomeModal({})
    }
  }, [isWelcomeModalOpen, openWelcomeModal, showWelcomeModal])

  return <Routes />
}
