import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tag,
  useMediaQuery,
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { NavigateFunction } from 'react-router-dom'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'

import { OnboardPager } from './components/OnboardPager'
import { OnboardingRoutes } from './config'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const selfCustodyRedirect = <Navigate to='/self-custody' replace />

export type NativeOnboardingModalProps = { browserNavigate: NavigateFunction }

export const NativeOnboarding: FC<NativeOnboardingModalProps> = ({ browserNavigate }) => {
  const { isOpen, close: closeModal } = useModal('nativeOnboard')
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose: closeModal,
    modalId: 'native-onboarding-modal',
  })

  const renderRoutes = useMemo(() => {
    return OnboardingRoutes.map(route => {
      const element = <route.component browserNavigate={browserNavigate} />
      // eslint-disable-next-line react-memo/require-usememo
      return <Route key={route.path} path={route.path} element={element} />
    })
  }, [browserNavigate])

  const handleClose = useCallback(() => {
    closeModal()
    store.dispatch(preferences.actions.setWelcomeModal({ show: false }))
  }, [closeModal])

  return (
    <Modal {...modalProps} size={isLargerThanMd ? undefined : 'full'}>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps}>
        <ModalHeader display='flex' alignItems='center' justifyContent='space-between'>
          <Tag size='sm' colorScheme='blue'>
            {translate('walletProvider.shapeShift.onboarding.shapeshiftWallet')}
          </Tag>
          <Button size='sm' onClick={handleClose} variant='ghost'>
            {translate('common.skip')}
          </Button>
        </ModalHeader>
        <MemoryRouter>
          <ModalBody>
            <AnimatePresence mode='wait' initial={false}>
              <Routes>
                {renderRoutes}
                <Route path='/' element={selfCustodyRedirect} />
              </Routes>
            </AnimatePresence>
          </ModalBody>
          <ModalFooter>
            <OnboardPager />
          </ModalFooter>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
