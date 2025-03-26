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
import { Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import { SelectModal } from './SelectModal'
import { NativeWalletRoutes } from './types'

import { SlideTransition } from '@/components/SlideTransition'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'

// Define a custom interface for our routes which includes the component property
interface CustomRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

export const WalletViewsSwitch = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const translate = useTranslate()
  const match = useMatch('/')
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
      dispatch({ type: WalletActions.OPEN_KEEPKEY_DISCONNECT })
    } else {
      navigate(INITIAL_WALLET_MODAL_ROUTE)
      if (disconnectOnCloseModal) {
        disconnect()
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
    navigate,
    wallet,
  ])

  const handleBack = useCallback(async () => {
    if (initialRoute === location.pathname && isMobile) {
      onClose()

      return
    }

    navigate(-1)
    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    const { pathname } = location
    if ([INITIAL_WALLET_MODAL_ROUTE, NativeWalletRoutes.Load].includes(pathname)) {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }

    await cancelWalletRequests()
  }, [dispatch, location, initialRoute, onClose, cancelWalletRequests, navigate])

  useEffect(() => {
    if (initialRoute) {
      navigate(initialRoute)
    }
  }, [navigate, initialRoute])

  /**
   * Memoize the routes list to avoid unnecessary re-renders unless the wallet changes
   */
  const supportedWallet =
    SUPPORTED_WALLETS[modalType as KeyManager] || SUPPORTED_WALLETS[KeyManager.MetaMask]
  const walletRoutesList = useMemo(
    () => {
      if (!modalType) return []
      
      // Use type assertion to inform TypeScript about the expected shape of routes
      const routes = supportedWallet.routes as unknown as CustomRouteProps[];
      
      return routes
        .filter(route => !!route.component)
        .map(route => {
          const Component = route.component;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={<Component />}
            />
          );
        });
    },
    [modalType, supportedWallet.routes],
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
            {match && showBackButton && (
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
              <Routes>
                {walletRoutesList}
                <Route path={INITIAL_WALLET_MODAL_ROUTE} element={renderSelectModal()} />
              </Routes>
            </SlideTransition>
          </AnimatePresence>
        </ModalContent>
      </Modal>
    </>
  )
}
