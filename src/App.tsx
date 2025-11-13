import type { ToastId } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { preferences } from './state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlag } from './state/slices/selectors'
import { useAppSelector } from './state/store'

import { ConsentBanner } from '@/components/ConsentBanner'
import { IconCircle } from '@/components/IconCircle'
import { useAddAccountsGuard } from '@/hooks/useAddAccountsGuard/useAddAccountsGuard'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useHasAppUpdated } from '@/hooks/useHasAppUpdated/useHasAppUpdated'
import { useLedgerAccountGuard } from '@/hooks/useLedgerAccountGuard/useLedgerAccountGuard'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { isMobile as isMobileApp } from '@/lib/globals'
import { AppRoutes } from '@/Routes/Routes'

export const App = () => {
  const navigate = useNavigate()
  const { hasUpdated } = useHasAppUpdated()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const showWelcomeModal = useSelector(preferences.selectors.selectShowWelcomeModal)
  const showConsentBanner = useAppSelector(preferences.selectors.selectShowConsentBanner)
  const isMixpanelEnabled = useAppSelector(state => selectFeatureFlag(state, 'Mixpanel'))
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')
  const { isOpen: isNativeOnboardOpen, open: openNativeOnboard } = useModal('nativeOnboard')

  useLedgerAccountGuard()
  useAddAccountsGuard()

  useEffect(() => {
    if (hasUpdated && !toast.isActive(updateId) && !isActionCenterEnabled) {
      const toastId = toast({
        icon: (
          <IconCircle boxSize={8} color='text.subtle'>
            <FaSync />
          </IconCircle>
        ),
        title: translate('updateToast.body'),
        onClick: () => window.location.reload(),
        id: updateId,
        duration: null,
        isClosable: true,
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
