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
  useMediaQuery,
  useToast,
} from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import type { KeyManager } from '../KeyManager'
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

import { Text } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeepKeyRoutes as KeepKeyRoutesEnum } from '@/context/WalletProvider/routes'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { reactQueries } from '@/react-queries'
import { breakpoints } from '@/theme/theme'
import { defaultSuspenseFallback } from '@/utils/makeSuspenseful'

const sectionsWidth = { base: 'full', md: '300px' }
const containerWidth = {
  base: 'full',
}

const arrowBackIcon = <ArrowBackIcon />

const INITIAL_WALLET_MODAL_ROUTE = '/'

type RightPanelProps = Omit<RightPanelContentProps, 'location'>

const modalSize = {
  base: 'full',
}

const containerMinHeight = {
  base: '650px',
  md: '800px',
}

const containerMaxHeight = {
  base: '650px',
  md: 'inherit',
}

const RightPanelContent = ({ isLoading, setIsLoading, error, setError }: RightPanelProps) => {
  const location = useLocation()
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
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const queryClient = useQueryClient()

  const navigate = useNavigate()
  const location = useLocation()
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
    // Save the pathname before navigation
    const pathname = location.pathname

    navigate(-1)

    // If we're back at the select wallet modal, remove the initial route
    // otherwise clicking the button for the same wallet doesn't do anything
    if ([INITIAL_WALLET_MODAL_ROUTE, NativeWalletRoutes.Load].includes(pathname)) {
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    }
    await cancelWalletRequests()
  }, [cancelWalletRequests, dispatch, navigate, location.pathname])

  const handleRouteReset = useCallback(() => {
    navigate(INITIAL_WALLET_MODAL_ROUTE, { replace: true })

    setSelectedWalletId(null)
    setError(null)
  }, [navigate])

  const onClose = useCallback(async () => {
    if (disposition === 'initializing' || disposition === 'recovering') {
      await wallet?.cancel()
      disconnect()
      dispatch({ type: WalletActions.OPEN_KEEPKEY_DISCONNECT })
    } else {
      navigate(INITIAL_WALLET_MODAL_ROUTE, { replace: true })
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

  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen: modal,
    onClose,
  })

  const handleWalletSelect = useCallback(
    (walletId: string, _initialRoute: string) => {
      if (_initialRoute) navigate(_initialRoute)

      setSelectedWalletId(walletId)
      setError(null)
    },
    [navigate],
  )

  useEffect(() => {
    if (initialRoute) navigate(initialRoute)
    // Don't add navigate as a dep, or problems.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoute])

  // Reset history on modal open/unmount - yes technically could be in the same effect as above
  // but such effects are such risky I ain't risking it
  useEffect(() => {
    if (!initialRoute) navigate('/', { replace: true })

    return () => {
      if (!initialRoute) navigate('/', { replace: true })
    }
    // Only run this on initial render, and unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set the native wallet pending unlock as selected on refresh
  useEffect(() => {
    if (!(nativeWalletPendingDeviceId && nativeVaultsQuery.data)) return

    setSelectedWalletId(nativeWalletPendingDeviceId)
  }, [nativeVaultsQuery.data, nativeWalletPendingDeviceId])

  // When the modal is closed, invalidate the queries for the native wallet
  useEffect(() => {
    return () => {
      queryClient.resetQueries({
        queryKey: reactQueries.common.hdwalletNativeVaultsList().queryKey,
      })
      queryClient.resetQueries({
        queryKey: ['native-create-vault'],
        exact: false,
      })
      queryClient.resetQueries({
        queryKey: ['native-create-words'],
        exact: false,
      })
    }
  }, [queryClient])

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

  const bodyBgColor = useColorModeValue('gray.50', '#2b2f33')
  const buttonContainerBgColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const Body = useCallback(() => {
    // These routes do not have a previous step, so don't display back button
    const isRootRoute = [
      '/',
      KeepKeyRoutesEnum.Pin,
      NativeWalletRoutes.Rename,
      NativeWalletRoutes.Delete,
    ].includes(location.pathname)
    // The main connect route for a given wallet. If we're here, clicking back should reset the route to the initial native CTA one
    const isConnectRoute =
      /^\/[^/]+\/connect$/.test(location.pathname) || location.pathname === '/native/enter-password'

    return (
      <Box flex={1} bg={bodyBgColor} p={6} position={isLargerThanMd ? 'relative' : 'initial'}>
        {!isRootRoute || !isLargerThanMd ? (
          <Box
            position='absolute'
            left={3}
            top={2}
            zIndex={1}
            bg={buttonContainerBgColor}
            borderRadius='2xl'
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
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              error={error}
              setError={setError}
            />
          </Box>
        </Flex>
      </Box>
    )
  }, [
    bodyBgColor,
    buttonContainerBgColor,
    error,
    handleBack,
    handleRouteReset,
    isLoading,
    location.pathname,
    translate,
    isLargerThanMd,
  ])

  const body = useMemo(() => <Body />, [Body])

  return (
    <>
      <Modal {...modalProps} isCentered size={!isLargerThanMd ? modalSize : undefined}>
        <ModalOverlay {...overlayProps} />
        <ModalContent
          justifyContent='center'
          overflow='hidden'
          borderRadius={!isLargerThanMd ? 'none' : 'xl'}
          maxW='900px'
          bg={!isLargerThanMd ? bodyBgColor : undefined}
          {...modalContentProps}
        >
          <Box position={isLargerThanMd ? 'relative' : 'initial'}>
            <Box
              position='absolute'
              right={!isLargerThanMd ? 3 : 3}
              top={!isLargerThanMd ? 3 : 3}
              zIndex={1}
              bg={buttonContainerBgColor}
              borderRadius='full'
            >
              <ModalCloseButton position='static' borderRadius='full' size='sm' />
            </Box>
            <Flex minH={containerMinHeight} maxH={containerMaxHeight} w={containerWidth}>
              <Suspense fallback={defaultSuspenseFallback}>
                <Routes>
                  {/* Always display sections for the root route, no matter the viewport */}
                  <Route path='/' element={sections} />
                  {/* For all non-root routes, only display sections (i.e 2-col layout) on desktop - mobile should be 2-step of sorts rather than a 2-col layout*/}
                  <Route path='*' element={isLargerThanMd ? sections : null} />
                </Routes>
                <Routes>
                  {/* Only display side panel after a wallet has been selected on mobile */}
                  <Route path='/' element={!isLargerThanMd ? null : <Body />} />
                  {/* And for all non-root routes, no matter the viewport */}
                  <Route path='*' element={body} />
                </Routes>
              </Suspense>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
    </>
  )
}
