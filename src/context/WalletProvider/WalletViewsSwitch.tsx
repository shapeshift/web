import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay
} from '@chakra-ui/react'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { AnimatePresence } from 'framer-motion'
import React, { useEffect } from 'react'
import { Route, Switch, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'

import { SUPPORTED_WALLETS } from './config'
import { NativePasswordRequired } from './NativeWallet/NativePasswordRequired'
import { SelectModal } from './SelectModal'
import { useWallet, WalletActions } from './WalletProvider'

export const WalletViewsSwitch = () => {
  const history = useHistory()
  const location = useLocation()
  const match = useRouteMatch('/')
  const { state, dispatch, connect } = useWallet()

  const onClose = () => {
    history.replace('/')
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }

  const handleBack = () => {
    history.goBack()
  }

  useEffect(() => {
    if (state?.initalRoute) {
      history.push(state.initalRoute)
    }
  }, [history, state?.initalRoute])

  return (
    <>
      <NativePasswordRequired
        onConnect={(wallet: NativeHDWallet) => {
          const { name, icon } = SUPPORTED_WALLETS['native']
          dispatch({
            type: WalletActions.SET_WALLET,
            // deviceId is an empty string because it will be set onSubmit of the password form.
            payload: { wallet, name, icon, deviceId: '' }
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        }}
      />
      <Modal isOpen={state.modal} onClose={onClose} isCentered>
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

                <Route children={() => <SelectModal connect={connect} />} />
              </Switch>
            </SlideTransition>
          </AnimatePresence>
        </ModalContent>
      </Modal>
    </>
  )
}
