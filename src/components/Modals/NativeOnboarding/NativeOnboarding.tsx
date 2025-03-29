import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tag,
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { OnboardPager } from './components/OnboardPager'
import { OnboardingRoutes } from './config'

import { useModal } from '@/hooks/useModal/useModal'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

const SelfCustodyRedirect = () => <Navigate to='/self-custody' replace />

export const NativeOnboarding = () => {
  const { isOpen, close: closeModal } = useModal('nativeOnboard')
  const translate = useTranslate()
  const renderRoutes = useMemo(() => {
    return OnboardingRoutes.map(route => (
      <Route key={route.path} path={route.path} element={route.component} />
    ))
  }, [])

  const handleClose = useCallback(() => {
    closeModal()
    store.dispatch(preferences.actions.setWelcomeModal({ show: false }))
  }, [closeModal])

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display='flex' alignItems='center' justifyContent='space-between'>
          <Tag size='sm' colorScheme='blue'>
            {translate('walletProvider.shapeShift.onboarding.shapeshiftWallet')}
          </Tag>
          <Button size='sm' onClick={handleClose} variant='ghost'>
            {translate('common.skip')}
          </Button>
        </ModalHeader>
        <MemoryRouter>
          <Routes>
            <Route
              path='*'
              element={
                <>
                  <ModalBody>
                    <AnimatePresence mode='wait' initial={false}>
                      <Routes>
                        {renderRoutes}
                        <Route path='/' element={<SelfCustodyRedirect />} />
                      </Routes>
                    </AnimatePresence>
                  </ModalBody>
                  <ModalFooter>
                    <OnboardPager activeRoute={useLocation().pathname} />
                  </ModalFooter>
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
