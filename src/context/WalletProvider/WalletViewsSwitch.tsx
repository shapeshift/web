import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { localWalletSlice } from 'state/slices/localWalletSlice/localWalletSlice'
import { store } from 'state/store'

import { SUPPORTED_WALLETS } from './config'
import { SelectModal } from './SelectModal'

const arrowBackIcon = <ArrowBackIcon />

export const WalletViewsSwitch = () => {
  const history = useHistory()
  const location = useLocation()
  const toast = useToast()
  const translate = useTranslate()
  const match = useRouteMatch('/')
  const {
    state: {
      wallet,
      modal,
      showBackButton,
      initialRoute,
      modalType,
      disconnectOnCloseModal,
      deviceState: { disposition },
    },
    dispatch,
    disconnect,
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

  const onClose = useCallback(async () => {
    if (disposition === 'initializing' || disposition === 'recovering') {
      await wallet?.cancel()
      disconnect()
      store.dispatch(localWalletSlice.actions.clearLocalWallet())
      dispatch({ type: WalletActions.OPEN_KEEPKEY_DISCONNECT })
    } else {
      history.replace('/')
      if (disconnectOnCloseModal) {
        disconnect()
        dispatch({ type: WalletActions.RESET_STATE })
        store.dispatch(localWalletSlice.actions.clearLocalWallet())
      } else {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      }
      await cancelWalletRequests()
    }
  }, [
    cancelWalletRequests,
    disconnect,
    disconnectOnCloseModal,
    dispatch,
    disposition,
    history,
    wallet,
  ])

  const handleBack = useCallback(async () => {
    history.goBack()
    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    if (history.location.pathname === '/select') {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }
    await cancelWalletRequests()
  }, [cancelWalletRequests, dispatch, history])

  useEffect(() => {
    if (initialRoute) {
      history.push(initialRoute)
    }
  }, [history, initialRoute])

  /**
   * Memoize the routes list to avoid unnecessary re-renders unless the wallet changes
   */
  const walletRoutesList = useMemo(
    () =>
      modalType
        ? SUPPORTED_WALLETS[modalType].routes.map(route => {
            const Component = route.component
            return !Component ? null : (
              <Route
                exact
                key={'route'}
                path={route.path}
                // we need to pass an arg here, so we need an anonymous function wrapper
                // eslint-disable-next-line react-memo/require-usememo
                render={routeProps => <Component {...routeProps} />}
              />
            )
          })
        : [],
    [modalType],
  )

  const renderSelectModal = useCallback(() => <SelectModal />, [])

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
                icon={arrowBackIcon}
                aria-label={translate('common.back')}
                variant='ghost'
                fontSize='xl'
                size='sm'
                isRound
                onClick={handleBack}
              />
            )}
            <ModalCloseButton ml='auto' borderRadius='full' position='static' />
          </Flex>
          <AnimatePresence mode='wait' initial={false}>
            <SlideTransition key={location.key}>
              <Switch key={location.pathname} location={location}>
                {walletRoutesList}
                <Route path={'/'} children={renderSelectModal} />
              </Switch>
            </SlideTransition>
          </AnimatePresence>
        </ModalContent>
      </Modal>
    </>
  )
}
