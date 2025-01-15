import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  IconButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SnapInstall } from '../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../MetaMask/components/SnapUpdate'
import { NativeWalletRoutes } from '../types'
import { InstalledWalletsSection } from './sections/InstalledWalletsSection'
import { MipdBody } from './wallets/mipd/MipdBody'

const sectionsWidth = { base: 'full', md: '300px' }
const containerWidth = {
  base: 'full',
  md: '900px',
}

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

type RightPanelContentProps = {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
}

const RightPanelContent = ({
  isLoading,
  setIsLoading,
  error,
  setError,
}: RightPanelContentProps) => {
  const {
    state: { modalType, isMipdProvider },
  } = useWallet()

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
          <Flex direction='column' alignItems='center' justifyContent='center' height='full'>
            <SnapInstall />
          </Flex>
        </Route>
        <Route path='/metamask/snap/update'>
          <Flex direction='column' alignItems='center' justifyContent='center' height='full'>
            <SnapUpdate />
          </Flex>
        </Route>
        <Route path='/'>
          <MipdBody
            rdns={modalType}
            isLoading={isLoading}
            error={error}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        </Route>
      </Switch>
    )
  }

  return null
}

export const NewWalletViewsSwitch = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const history = useHistory()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: {
      wallet,
      modal,
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

  useEffect(() => {
    if (initialRoute) history.push(initialRoute)
  }, [history, initialRoute])

  // Reset initial route on connect to handle e.g switching from MM with snap install route to another mipd provider
  const handleConnect = useCallback(() => {
    if (initialRoute) history.push(initialRoute)
  }, [history, initialRoute])

  const sections = useMemo(
    () => (
      <Box w={sectionsWidth} p={6}>
        <Text translation='common.connectWallet' fontSize='xl' fontWeight='semibold' />
        <InstalledWalletsSection
          modalType={modalType}
          isLoading={isLoading}
          onConnect={handleConnect}
        />
        {/* TODO(gomes): more sections */}
      </Box>
    ),
    [handleConnect, isLoading, modalType],
  )

  const body = useMemo(
    () => (
      <Box flex={1} bg='whiteAlpha.50' p={6}>
        <RightPanelContent
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          error={error}
          setError={setError}
        />
      </Box>
    ),
    [error, isLoading],
  )

  const maybeMobileBackButton = useMemo(() => {
    if (!isMobile) return
    return (
      <Switch>
        <Route exact path='/' />
        <Route path='*'>
          {/* Precisely what it says on the var name - adds a back button for mobile only, and for non-root paths only
           *  (i.e, can't go back when in root path)
           */}
          <Box
            position='absolute'
            left={3}
            top={3}
            zIndex={1}
            bg='whiteAlpha.100'
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
        </Route>
      </Switch>
    )
  }, [handleBack, translate])

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

            {maybeMobileBackButton}
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
                <Route exact path='/'>
                  {!isMobile ? body : null}
                </Route>
                {/* And for all non-root routes, no matter the viewport */}
                <Route path='*'>{body}</Route>
              </Switch>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
    </>
  )
}
