import type { ToastId } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { AppUpdateNotification } from './components/Layout/Header/ActionCenter/components/Notifications/AppUpdateNotification'
import { preferences } from './state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlag } from './state/slices/selectors'
import { useAppSelector } from './state/store'

import { ConsentBanner } from '@/components/ConsentBanner'
import { useBridgeClaimNotification } from '@/hooks/useBridgeClaimNotification/useBridgeClaimNotification'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useHasAppUpdated } from '@/hooks/useHasAppUpdated/useHasAppUpdated'
import { useLedgerAccountCheck } from '@/hooks/useLedgerAccountCheck/useLedgerAccountCheck'
import { useModal } from '@/hooks/useModal/useModal'
import { isMobile as isMobileApp } from '@/lib/globals'
import { AppRoutes } from '@/Routes/Routes'

export const App = () => {
  const navigate = useNavigate()
  const { hasUpdated } = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const showWelcomeModal = useSelector(preferences.selectors.selectShowWelcomeModal)
  const showConsentBanner = useAppSelector(preferences.selectors.selectShowConsentBanner)
  const isMixpanelEnabled = useAppSelector(state => selectFeatureFlag(state, 'Mixpanel'))
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')
  const { isOpen: isNativeOnboardOpen, open: openNativeOnboard } = useModal('nativeOnboard')

  useBridgeClaimNotification()
  useLedgerAccountCheck()

  useEffect(() => {
    if (hasUpdated && !toast.isActive(updateId) && !isActionCenterEnabled) {
      const toastId = toast({
        render: ({ onClose }) => <AppUpdateNotification onClose={onClose} />,
        id: updateId,
        duration: null,
        isClosable: true,
        position: 'bottom-right',
      })
      if (!toastId) return
      toastIdRef.current = toastId
    }
  }, [hasUpdated, toast, translate, isActionCenterEnabled])

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
