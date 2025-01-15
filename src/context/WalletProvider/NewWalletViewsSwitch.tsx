import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack,
  Text as CText,
  useToast,
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import uniqBy from 'lodash/uniqBy'
import { useCallback, useEffect, useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { staticMipdProviders, useMipdProviders } from 'lib/mipd'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import { SelectModal } from './SelectModal'
import { NativeWalletRoutes } from './types'

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

const InstalledWalletsSection = () => {
  const detectedMipdProviders = useMipdProviders()

  const supportedStaticProviders = useMemo(() => {
    if (isMobileApp || isMobile) return []
    return staticMipdProviders
  }, [])

  const mipdProviders = useMemo(
    () => uniqBy(detectedMipdProviders.concat(supportedStaticProviders), 'info.rdns'),
    [detectedMipdProviders, supportedStaticProviders],
  )

  const filteredProviders = useMemo(
    () =>
      mipdProviders.filter(
        provider =>
          provider.info.rdns !== 'app.keplr' &&
          provider.info.rdns !== 'app.phantom' &&
          provider.info.rdns !== 'com.coinbase.wallet',
      ),
    [mipdProviders],
  )

  return (
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='Installed' />
      {filteredProviders.map(provider => (
        <Box
          as={Button}
          key={provider.info.rdns}
          variant='ghost'
          px={2}
          ml={-2}
          py={6}
          borderRadius='md'
          width='full'
        >
          <Flex alignItems='center' width='full'>
            <Image src={provider.info.icon} boxSize='24px' mr={3} />
            <CText>{provider.info.name}</CText>
          </Flex>
        </Box>
      ))}
    </Stack>
  )
}

export const NewWalletViewsSwitch = () => {
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
      dispatch({ type: WalletActions.OPEN_KEEPKEY_DISCONNECT })
    } else {
      history.replace(INITIAL_WALLET_MODAL_ROUTE)
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
    history,
    wallet,
  ])

  const handleBack = useCallback(async () => {
    history.goBack()
    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    const { pathname } = history.location
    if ([INITIAL_WALLET_MODAL_ROUTE, NativeWalletRoutes.Load].includes(pathname)) {
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
  const supportedWallet =
    SUPPORTED_WALLETS[modalType as KeyManager] || SUPPORTED_WALLETS[KeyManager.MetaMask]
  const walletRoutesList = useMemo(
    () =>
      modalType
        ? supportedWallet.routes.map(route => {
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
        <ModalContent justifyContent='center' overflow='hidden' borderRadius='xl' maxW='900px'>
          <Box position='relative'>
            <Box
              position='absolute'
              right={3}
              top={3}
              zIndex={1}
              bg='whiteAlpha.100'
              borderRadius='full'
            >
              <ModalCloseButton position='static' borderRadius='full' size='sm' />
            </Box>

            <Flex minH='600px' w='900px'>
              {/* Left container with wallet selection etc - todo extract me into component */}

              <Box w='300px' p={6}>
                <Text translation='common.connectWallet' fontSize='xl' fontWeight='semibold' />
                <InstalledWalletsSection />
                {/* TODO(gomes): more section */}
              </Box>
              {/* Right container with actual functionality - todo implement me */}
              <Box flex={1} bg='whiteAlpha.50' p={6}></Box>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
    </>
  )
}
