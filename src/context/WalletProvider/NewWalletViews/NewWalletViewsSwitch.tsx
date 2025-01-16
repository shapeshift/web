import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import type { Location } from 'history'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import type { StaticContext } from 'react-router'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SnapInstall } from '../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../MetaMask/components/SnapUpdate'
import { EnterPassword } from '../NativeWallet/components/EnterPassword'
import { NativeCreate } from '../NativeWallet/components/NativeCreate'
import { NativeImportKeystore } from '../NativeWallet/components/NativeImportKeystore'
import { NativeImportSeed } from '../NativeWallet/components/NativeImportSeed'
import { NativeImportSelect } from '../NativeWallet/components/NativeImportSelect'
import { NativePassword } from '../NativeWallet/components/NativePassword'
import { NativeSuccess } from '../NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from '../NativeWallet/components/NativeTestPhrase'
import type { NativeSetupProps } from '../NativeWallet/types'
import { NativeWalletRoutes } from '../types'
import { InstalledWalletsSection } from './sections/InstalledWalletsSection'
import { SavedWalletsSection } from './sections/SavedWalletsSection'
import { MipdBody } from './wallets/mipd/MipdBody'
import { NativeStart } from './wallets/native/NativeStart'

const sectionsWidth = { base: 'full', md: '300px' }
const containerWidth = {
  base: 'full',
}

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

type RightPanelContentProps = {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  location: Location
}

const nativeRoutes = (
  <Switch>
    <Route
      exact
      path={NativeWalletRoutes.ImportKeystore}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeImportKeystore {...routeProps} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.ImportSeed}
      // TODO(gomes): add NativeImportSelectNew with new design
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeImportSeed {...routeProps} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.ImportSelect}
      // TODO(gomes): add NativeImportSelectNew with new design
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeImportSelect {...routeProps} />}
    />
    <Route exact path={NativeWalletRoutes.Create}>
      <NativeCreate />
    </Route>
    <Route
      exact
      path={NativeWalletRoutes.Password}
      // TODO(gomes): add NativePassowrdNew with new design
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativePassword {...(routeProps as NativeSetupProps)} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.EnterPassword}
      // TODO(gomes): add EnterPasswordNew with new design
    >
      <EnterPassword />
    </Route>
    <Route
      exact
      path={NativeWalletRoutes.Success}
      // TODO(gomes): add NativeSuccessNew with new design
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeSuccess {...(routeProps as NativeSetupProps)} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.CreateTest}
      // TODO(gomes): add NativeTestPhraseNew with new design
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeTestPhrase {...(routeProps as NativeSetupProps)} />}
    />
  </Switch>
)

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

  if (location.pathname.startsWith('/native')) return nativeRoutes

  // No modal type, and no in-flight native routes - assume enpty state
  if (!modalType || modalType === 'native' || location.pathname === '/') return <NativeStart />

  if (isMipdProvider && modalType) {
    return (
      <Switch>
        <Route exact path='/metamask/connect'>
          <MipdBody
            rdns={modalType}
            isLoading={isLoading}
            error={error}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        </Route>
        <Route path='/metamask/snap/install'>
          <SnapInstall />
        </Route>
        <Route path='/metamask/snap/update'>
          <SnapUpdate />
        </Route>
      </Switch>
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
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: {
      wallet,
      modal,
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
      setSelectedWalletId(walletId)
      if (_initialRoute) history.push(_initialRoute)
    },
    [history],
  )
  // Reset history on modal open/unmount
  useEffect(() => {
    history.replace('/')

    return () => {
      history.replace('/')
    }
    // Only run this on initial render, and unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sections = useMemo(
    () => (
      <Box w={sectionsWidth} p={6}>
        <SavedWalletsSection
          selectedWalletId={selectedWalletId}
          onWalletSelect={handleWalletSelect}
        />
        <Text translation='common.connectWallet' fontSize='xl' fontWeight='semibold' />
        <InstalledWalletsSection
          isLoading={isLoading}
          selectedWalletId={selectedWalletId}
          onWalletSelect={handleWalletSelect}
        />
        {/* TODO(gomes): more sections */}
      </Box>
    ),
    [handleWalletSelect, isLoading, selectedWalletId],
  )

  const bodyBgColor = useColorModeValue('gray.50', 'whiteAlpha.50')
  const buttonContainerBgColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const body = useCallback(
    (routeProps: RouteComponentProps<{}, StaticContext, unknown>) => {
      // These routes do not have a previous step, so don't display back button
      const isRootRoute =
        routeProps.history.location.pathname === '/' ||
        routeProps.history.location.pathname === '/metamask/connect'
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
                onClick={handleBack}
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
    [bodyBgColor, buttonContainerBgColor, error, handleBack, isLoading, translate],
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
            <Flex minH='600px' w={containerWidth}>
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
