import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SUPPORTED_WALLETS } from '../config'
import { KeyManager } from '../KeyManager'
import { SnapInstall } from '../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../MetaMask/components/SnapUpdate'
import { SelectModal } from '../SelectModal'
import { NativeWalletRoutes } from '../types'
import { InstalledWalletsSection } from './sections/InstalledWalletsSection'
import { MipdBody } from './wallets/mipd/MipdBody'

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

const RightPanelContent = ({ selectedProvider }: { selectedProvider: string | null }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const location = useLocation()
  console.log({ location })
  const isMipdRoute = location.pathname.startsWith('/metamask')

  if (isMipdRoute && selectedProvider) {
    return (
      <Switch>
        <Route exact path='/metamask/connect'>
          <MipdBody
            rdns={selectedProvider}
            loading={loading}
            error={error}
            setLoading={setLoading}
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
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const history = useHistory()
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
      isMipdProvider,
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

  const handleProviderClick = useCallback((provider: string) => {
    setSelectedProvider(provider)
  }, [])

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
              <Box w='300px' p={6}>
                <Text translation='common.connectWallet' fontSize='xl' fontWeight='semibold' />
                <InstalledWalletsSection
                  selectedWallet={selectedProvider}
                  onSelectWallet={handleProviderClick}
                />
                {/* TODO(gomes): more section */}
              </Box>
              <Box flex={1} bg='whiteAlpha.50' p={6}>
                <RightPanelContent selectedProvider={selectedProvider} />
              </Box>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
    </>
  )
}
