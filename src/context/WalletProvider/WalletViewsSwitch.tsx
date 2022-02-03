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
import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'

import { SUPPORTED_WALLETS } from './config'
import { SelectModal } from './SelectModal'
import { useWallet, WalletActions } from './WalletProvider'

export const WalletViewsSwitch = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const match = useMatch('/')
  const { state, dispatch } = useWallet()

  const onClose = () => {
    ;<Navigate to='/' replace />
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }

  const handleBack = () => {
    navigate(-1)
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    if (location.pathname === '/') {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }
  }

  useEffect(() => {
    if (state?.initialRoute) {
      navigate(state.initialRoute)
    }
  }, [navigate, state.initialRoute])

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
            {!match && (
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
              <Routes key={location.pathname} location={location}>
                {state.type &&
                  SUPPORTED_WALLETS[state.type].routes.map((route, index) => {
                    const Component = <WalletComponet />
                    const pathRoute: any = route.path
                    return !Component ? null : (
                      <Route
                        key={index}
                        path={pathRoute}
                        element={(routeProps: any) => <WalletComponet {...routeProps} />}
                      />
                    )
                  })}

                <Route children={() => <SelectModal />} />
              </Routes>
            </SlideTransition>
          </AnimatePresence>
        </ModalContent>
      </Modal>
    </>
  )
}

class WalletComponet extends React.Component<any, any> {
  render() {
    return <div>{this.props.children}</div>
  }
}
