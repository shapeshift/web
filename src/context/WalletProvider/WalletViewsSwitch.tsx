import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SUPPORTED_WALLETS } from './config'
import { SelectModal } from './SelectModal'

export const WalletViewsSwitch = () => {
  const history = useHistory()
  const location = useLocation()
  const toast = useToast()
  const translate = useTranslate()
  const match = useRouteMatch('/')
  const {
    state: { wallet, modal, showBackButton, initialRoute, type },
    dispatch,
  } = useWallet()

  const cancelWalletRequests = useCallback(async () => {
    await wallet?.cancel().catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }, [toast, translate, wallet])

  const onClose = async () => {
    history.replace('/')
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    await cancelWalletRequests()
  }

  const handleBack = async () => {
    history.goBack()
    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    if (history.location.pathname === '/') {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }
    await cancelWalletRequests()
  }

  useEffect(() => {
    if (initialRoute) {
      history.push(initialRoute)
    }
  }, [history, initialRoute])

  return (
    <>
      <Modal
        isOpen={modal}
        onClose={onClose}
        isCentered
        trapFocus={false}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
          <Flex justifyContent='space-between' alignItems='center' position='relative'>
            {!match?.isExact && showBackButton && (
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
                {type &&
                  SUPPORTED_WALLETS[type].routes.map((route, index) => {
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
