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
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { useModal } from 'hooks/useModal/useModal'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { store } from 'state/store'

import { OnboardPager } from './components/OnboardPager'
import { OnboardingRoutes } from './config'

export const NativeOnboarding = () => {
  const { isOpen, close: closeModal } = useModal('nativeOnboard')
  const translate = useTranslate()
  const renderRoutes = useMemo(() => {
    return OnboardingRoutes.map(route => (
      <Route key={route.path} path={route.path} component={route.component} />
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
          <Route>
            {({ location }) => (
              <>
                <ModalBody>
                  <AnimatePresence exitBeforeEnter initial={false}>
                    <Switch key={location.key} location={location}>
                      {renderRoutes}
                      <Redirect exact from='/' to='/self-custody' />
                    </Switch>
                  </AnimatePresence>
                </ModalBody>
                <ModalFooter>
                  <OnboardPager activeRoute={location.pathname} />
                </ModalFooter>
              </>
            )}
          </Route>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
