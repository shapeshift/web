import { Alert, AlertDescription } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import type { ToastId } from '@chakra-ui/toast'
import { useToast } from '@chakra-ui/toast'
import { useEffect, useRef } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Routes } from 'Routes/Routes'
import { IconCircle } from 'components/IconCircle'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'
import { useModal } from 'hooks/useModal/useModal'
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
