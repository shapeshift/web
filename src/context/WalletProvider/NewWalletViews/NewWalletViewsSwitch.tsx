import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Divider,
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import type { StaticContext } from 'react-router'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeepKeyRoutes as KeepKeyRoutesEnum } from 'context/WalletProvider/routes'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { KeyManager } from '../KeyManager'
import type { LocationState } from '../NativeWallet/types'
import { NativeWalletRoutes } from '../types'
import { RDNS_TO_FIRST_CLASS_KEYMANAGER } from './constants'
import { KeepKeyRoutes } from './routes/KeepKeyRoutes'
import { LedgerRoutes } from './routes/LedgerRoutes'
import { MipdRoutes } from './routes/MipdRoutes'
import { NativeRoutes } from './routes/NativeRoutes'
import { WalletConnectV2Routes } from './routes/WalletConnectV2Routes'
import { HardwareWalletsSection } from './sections/HardwareWalletsSection'
import { InstalledWalletsSection } from './sections/InstalledWalletsSection'
import { OthersSection } from './sections/OthersSection'
import { SavedWalletsSection } from './sections/SavedWalletsSection'
import type { RightPanelContentProps } from './types'
import { NativeIntro } from './wallets/native/NativeIntro'

const sectionsWidth = { base: 'full', md: '300px' }
const containerWidth = {
  base: 'full',
}

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

const RightPanelContent = ({
  isLoading,
  setIsLoading,
  error,
  setError,
  location,
}: RightPanelContentProps) => {
  const {
    state: { modalType, isMipdProvider },
  } = useWallet()

  const shouldDisplayIntro = useMemo(
    () => !modalType || modalType === 'native' || location.pathname === '/',
    [modalType, location.pathname],
  )

  if (location.pathname.startsWith('/native')) return <NativeRoutes />
  if (location.pathname.startsWith('/walletconnectv2')) return <WalletConnectV2Routes />
  if (location.pathname.startsWith('/ledger')) return <LedgerRoutes />
  if (location.pathname.startsWith('/keepkey')) return <KeepKeyRoutes />

  if (shouldDisplayIntro) return <NativeIntro />

  const isFirstClass =
    modalType && Object.values(RDNS_TO_FIRST_CLASS_KEYMANAGER).includes(modalType as KeyManager)

  if ((isMipdProvider || isFirstClass) && modalType) {
    return (
      <MipdRoutes
        isLoading={isLoading}
        error={error}
        setIsLoading={setIsLoading}
        setError={setError}
      />
    )
  }

  return null
}

export const NewWalletViewsSwitch = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // For visual tracking only. Do *not* use me in place of wallet state. This means exactly what you think the intent is:
  // the option which is currently selected by the user (has been clicked), and is *not* related to the current wallet in the store.
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)

  const history = useHistory()
  const location = useLocation<LocationState>()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: {
      wallet,
      modal,
      disconnectOnCloseModal,
      deviceState: { disposition },
      initialRoute,
      nativeWalletPendingDeviceId,
    },
    dispatch,
    disconnect,
  } = useWallet()

  const nativeVaultsQuery = useQuery({
    ...reactQueries.common.hdwalletNativeVaultsList(),
    refetchOnMount: true,
  })

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

  const handleBack = useCallback(async () => {
    const { pathname } = history.location

    if (location.state?.vault && pathname === NativeWalletRoutes.CreateTest) {
      history.replace({
        pathname: NativeWalletRoutes.Create,
        state: { vault: location.state.vault },
      })

      // Queue navigation in the next tick to ensure state is updated
      setTimeout(() => {
        history.goBack()
      }, 0)
    } else {
      history.goBack()
    }

    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    if ([INITIAL_WALLET_MODAL_ROUTE, NativeWalletRoutes.Load].includes(pathname)) {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }
    await cancelWalletRequests()
  }, [cancelWalletRequests, dispatch, history, location.state])

  const handleRouteReset = useCallback(() => {
    history.replace(INITIAL_WALLET_MODAL_ROUTE)

    setSelectedWalletId(null)
    setError(null)
  }, [history])

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

  const handleWalletSelect = useCallback(
    (walletId: string, _initialRoute: string) => {
      if (_initialRoute) history.push(_initialRoute)

      setSelectedWalletId(walletId)
      setError(null)
    },
    [history],
  )

  useEffect(() => {
    if (initialRoute) history.push(initialRoute)
  }, [history, initialRoute])

  // Set the native wallet pending unlock as selected on refresh
  useEffect(() => {
    if (!(nativeWalletPendingDeviceId && nativeVaultsQuery.data)) return

    setSelectedWalletId(nativeWalletPendingDeviceId)
  }, [nativeVaultsQuery.data, nativeWalletPendingDeviceId])

  // Reset history on modal open/unmount
  useEffect(() => {
    if (!initialRoute) history.replace('/')

    return () => {
      if (!initialRoute) history.replace('/')
    }
    // Only run this on initial render, and unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sections = useMemo(
    () => (
      <Box w={sectionsWidth} p={6} maxH='800px' overflowY='auto'>
        <SavedWalletsSection
          selectedWalletId={selectedWalletId}
          onWalletSelect={handleWalletSelect}
        />
        <Divider mb={2} />
        <Text translation='common.connectWallet' fontSize='xl' fontWeight='semibold' />
        <InstalledWalletsSection
          isLoading={isLoading}
          selectedWalletId={selectedWalletId}
          onWalletSelect={handleWalletSelect}
        />
        <Divider mb={2} />
        <HardwareWalletsSection
          selectedWalletId={selectedWalletId}
          onWalletSelect={handleWalletSelect}
          isLoading={isLoading}
        />
        <Divider mb={2} />
        <OthersSection
          isLoading={isLoading}
          selectedWalletId={selectedWalletId}
          onWalletSelect={handleWalletSelect}
        />
      </Box>
    ),
    [handleWalletSelect, isLoading, selectedWalletId],
  )

  const bodyBgColor = useColorModeValue('gray.50', 'whiteAlpha.50')
  const buttonContainerBgColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const body = useCallback(
    (routeProps: RouteComponentProps<{}, StaticContext, unknown>) => {
      // These routes do not have a previous step, so don't display back button
      const isRootRoute = ['/', KeepKeyRoutesEnum.Pin].includes(
        routeProps.history.location.pathname,
      )
      // The main connect route for a given wallet. If we're here, clicking back should reset the route to the initial native CTA one
      const isConnectRoute =
        /^\/[^/]+\/connect$/.test(routeProps.history.location.pathname) ||
        routeProps.history.location.pathname === '/native/enter-password'

      return (
        <Box flex={1} bg={bodyBgColor} p={6} position='relative'>
          {!isRootRoute || isMobile ? (
            <Box
              position='absolute'
              left={3}
              top={3}
              zIndex={1}
              bg={buttonContainerBgColor}
              borderRadius='full'
            >
              <IconButton
                icon={arrowBackIcon}
                aria-label={translate('common.back')}
                variant='ghost'
                fontSize='xl'
                size='sm'
                isRound
                position='static'
                isDisabled={isLoading}
                onClick={isConnectRoute ? handleRouteReset : handleBack}
              />
            </Box>
          ) : null}
          <Flex height='full' alignItems='center'>
            <Box width='full'>
              <RightPanelContent
                location={routeProps.history.location}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                error={error}
                setError={setError}
              />
            </Box>
          </Flex>
        </Box>
      )
    },
    [
      bodyBgColor,
      buttonContainerBgColor,
      error,
      handleBack,
      handleRouteReset,
      isLoading,
      translate,
    ],
  )

  const bodyDesktopOnly = useCallback(
    (routeProps: RouteComponentProps<{}, StaticContext, unknown>) => {
      if (isMobile) return null

      return body(routeProps)
    },
    [body],
  )

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
              bg={buttonContainerBgColor}
              borderRadius='full'
            >
              <ModalCloseButton position='static' borderRadius='full' size='sm' />
            </Box>
            <Flex minH='800px' w={containerWidth}>
              <Switch>
                {/* Always display sections for the root route, no matter the viewport */}
                <Route exact path='/'>
                  {sections}
                </Route>
                {/* For all non-root routes, only display sections (i.e 2-col layout) on desktop - mobile should be 2-step of sorts rather than a 2-col layout*/}
                <Route path='*'>{!isMobile ? sections : null}</Route>
              </Switch>
              <Switch>
                {/* Only display side panel after a wallet has been selected on mobile */}
                <Route exact path='/' render={bodyDesktopOnly} />
                {/* And for all non-root routes, no matter the viewport */}
                <Route path='*' render={body} />
              </Switch>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
    </>
  )
}
