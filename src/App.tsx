import type { ResponsiveValue, ToastId } from '@chakra-ui/react'
import { Alert, AlertDescription, Button, CloseButton, Flex, useToast } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback, useEffect, useRef } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { preferences } from './state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlag } from './state/slices/selectors'
import { useAppSelector } from './state/store'

import { ConsentBanner } from '@/components/ConsentBanner'
import { IconCircle } from '@/components/IconCircle'
import { useBridgeClaimNotification } from '@/hooks/useBridgeClaimNotification/useBridgeClaimNotification'
import { useHasAppUpdated } from '@/hooks/useHasAppUpdated/useHasAppUpdated'
import { useModal } from '@/hooks/useModal/useModal'
import { isMobile as isMobileApp } from '@/lib/globals'
import { AppRoutes } from '@/Routes/Routes'

const flexGap = { base: 2, md: 3 }
const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexAlignItems = { base: 'flex-start', md: 'center' }

export const App = () => {
  const navigate = useNavigate()
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const showWelcomeModal = useSelector(preferences.selectors.selectShowWelcomeModal)
  const showConsentBanner = useAppSelector(preferences.selectors.selectShowConsentBanner)
  const isMixpanelEnabled = useAppSelector(state => selectFeatureFlag(state, 'Mixpanel'))
  const { isOpen: isNativeOnboardOpen, open: openNativeOnboard } = useModal('nativeOnboard')

  useBridgeClaimNotification()

  const handleCtaClick = useCallback(() => window.location.reload(), [])

  useEffect(() => {
    if (shouldUpdate && !toast.isActive(updateId)) {
      const toastId = toast({
        render: ({ onClose }) => {
          return (
            <Alert status='info' variant='update-box' borderRadius='lg' gap={3}>
              <IconCircle boxSize={8} color='text.subtle'>
                <FaSync />
              </IconCircle>
              <Flex gap={flexGap} flexDir={flexDir} alignItems={flexAlignItems}>
                <AlertDescription letterSpacing='0.02em'>
                  {translate('updateToast.body')}
                </AlertDescription>

                <Button colorScheme='blue' size='sm' onClick={handleCtaClick}>
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
  }, [handleCtaClick, shouldUpdate, toast, translate])

  useEffect(() => {
    if (showWelcomeModal && !isNativeOnboardOpen) {
      openNativeOnboard({ browserNavigate: navigate })
    }
  }, [isNativeOnboardOpen, openNativeOnboard, showWelcomeModal, navigate])

  return (
    <>
      {showConsentBanner && isMixpanelEnabled && !isMobileApp && <ConsentBanner />}
      <AppRoutes />
    </>
  )
}
