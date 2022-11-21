import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { ConnectRoutes } from './ConnectCommon'
import { ConnectRouter } from './ConnectRouter'

export const entries = [ConnectRoutes.Index, ConnectRoutes.Accounts]

type Props = {
  isOpen: boolean
  onClose(): void
}

const Connect = ({ isOpen, onClose }: Props) => {
  const [account, setAccount] = useState<AccountId | null>(null)
  const handleAccountChange = useCallback((account: AccountId) => {
    setAccount(account)
  }, [])
  const { connect } = useWalletConnect()
  const handleConnect = useCallback(
    (uri: string) => {
      connect(uri, account ? fromAccountId(account).account : null)
      onClose()
    },
    [connect, onClose, account],
  )
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        textAlign='center'
        p={0}
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalCloseButton position='absolute' color='gray.500' />
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              <ConnectRouter
                handleConnect={handleConnect}
                handleAccountChange={handleAccountChange}
                account={account}
              />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const ConnectModal = Connect
