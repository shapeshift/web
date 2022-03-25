import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { Route, Switch, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'

import { SUPPORTED_WALLETS } from './config'
import { SelectModal } from './SelectModal'
import { useWallet, WalletActions } from './WalletProvider'

export const WalletViewsSwitch = () => {
  const history = useHistory()
  const location = useLocation()
  const match = useRouteMatch('/')
  const { state, dispatch } = useWallet()

  const onClose = () => {
    history.replace('/')
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }

  const handleBack = () => {
    history.goBack()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    if (history.location.pathname === '/') {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }
  }

  useEffect(() => {
    if (state?.initialRoute) {
      history.push(state.initialRoute)
    }
  }, [history, state?.initialRoute])

  return (
    <>
      <Modal
        isOpen={state.modal}
        onClose={onClose}
        isCentered
        trapFocus={false}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
          <Flex justifyContent='space-between' alignItems='center' position='relative'>
            {!match?.isExact && (
              <IconButton
                icon={<ArrowBackIcon />}
                aria-label='Back'
                variant='ghost'
                fontSize='xl'
                size='sm'
                isRound
                onClick={handleBack}
              />
            )}
            <ModalCloseButton ml='auto' borderRadius='full' position='static' />
          </Flex>
          <AnimatePresence exitBeforeEnter initial={false}>
            <SlideTransition key={location.key}>
              <Switch key={location.pathname} location={location}>
                {state.type &&
                  SUPPORTED_WALLETS[state.type].routes.map((route, index) => {
                    const Component = route.component
                    return !Component ? null : (
                      <Route
                        exact
                        key={index}
                        path={route.path}
                        render={routeProps => <Component {...routeProps} />}
                      />
                    )
                  })}

                <Route children={() => <SelectModal />} />
              </Switch>
            </SlideTransition>
          </AnimatePresence>
        </ModalContent>
      </Modal>
    </>
  )
}
