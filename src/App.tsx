import type { ToastId } from '@chakra-ui/react'
import { Alert, AlertDescription, Button, CloseButton, Flex, useToast } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Routes } from 'Routes/Routes'
import { ConsentBanner } from 'components/ConsentBanner'
import { IconCircle } from 'components/IconCircle'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'
import { useModal } from 'hooks/useModal/useModal'
import { selectShowConsentBanner, selectShowWelcomeModal } from 'state/slices/selectors'

export const App = () => {
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const showWelcomeModal = useSelector(selectShowWelcomeModal)
  const showConsentBanner = useSelector(selectShowConsentBanner)
  const { isOpen: isNativeOnboardOpen, open: openNativeOnboard } = useModal('nativeOnboard')

  useEffect(() => {
    if (shouldUpdate && !toast.isActive(updateId)) {
      const toastId = toast({
        render: ({ onClose }) => {
          return (
            <Alert status='info' variant='update-box' borderRadius='lg' gap={3}>
              <IconCircle boxSize={8} color='text.subtle'>
                <FaSync />
              </IconCircle>
              <Flex
                gap={{ base: 2, md: 3 }}
                flexDir={{ base: 'column', md: 'row' }}
                alignItems={{ base: 'flex-start', md: 'center' }}
              >
                <AlertDescription letterSpacing='0.02em'>
                  {translate('updateToast.body')}
                </AlertDescription>

                <Button colorScheme='blue' size='sm' onClick={() => window.location.reload()}>
                  {translate('updateToast.cta')}
                </Button>
              </Flex>
              <CloseButton onClick={onClose} size='sm' />
            </Alert>
          )
        },
        id: updateId,
        duration: null,
        isClosable: true,
        position: 'bottom-right',
      })
      if (!toastId) return
      toastIdRef.current = toastId
    }
  }, [shouldUpdate, toast, translate])

  useEffect(() => {
    if (showWelcomeModal && !isNativeOnboardOpen) {
      openNativeOnboard({})
    }
  }, [isNativeOnboardOpen, openNativeOnboard, showWelcomeModal])

  return (
    <>
      {showConsentBanner && <ConsentBanner />}
      <Routes />
    </>
  )
}
