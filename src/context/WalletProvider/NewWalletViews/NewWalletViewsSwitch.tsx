import {
  Box,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SnapInstall } from '../MetaMask/components/SnapInstall'
import { SnapUpdate } from '../MetaMask/components/SnapUpdate'
import { InstalledWalletsSection } from './sections/InstalledWalletsSection'
import { MipdBody } from './wallets/mipd/MipdBody'

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
                  modalType={modalType}
                  isLoading={isLoading}
                  onConnect={handleConnect}
                />
                {/* TODO(gomes): more sections */}
              </Box>
              <Box flex={1} bg='whiteAlpha.50' p={6}>
                <RightPanelContent
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  error={error}
                  setError={setError}
                />
              </Box>
            </Flex>
          </Box>
        </ModalContent>
      </Modal>
    </>
  )
}
