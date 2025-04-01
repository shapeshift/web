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
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { NavigateFunction } from 'react-router-dom'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'

import { OnboardPager } from './components/OnboardPager'
import { OnboardingRoutes } from './config'

import { useModal } from '@/hooks/useModal/useModal'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

const SelfCustodyRedirect = () => <Navigate to='/self-custody' replace />

export type NativeOnboardingModalProps = { browserNavigate: NavigateFunction }

export const NativeOnboarding: FC<NativeOnboardingModalProps> = ({ browserNavigate }) => {
  const { isOpen, close: closeModal } = useModal('nativeOnboard')
  const translate = useTranslate()
  const renderRoutes = useMemo(() => {
    return OnboardingRoutes.map(route => {
      const element = <route.component browserNavigate={browserNavigate} />
      return <Route key={route.path} path={route.path} element={element} />
    })
  }, [browserNavigate])

  const handleClose = useCallback(() => {
    closeModal()
    store.dispatch(preferences.actions.setWelcomeModal({ show: false }))
  }, [closeModal])

  const handleCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    store.dispatch(preferences.actions.setShowSnapsModal(!event.target.checked))
  }, [])

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
                    <OnboardPager />
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
