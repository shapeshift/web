import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { ConnectContent } from 'plugins/walletConnectToDapps/components/modals/connect/ConnectContent'
import { isWalletConnectV2Uri } from 'plugins/walletConnectToDapps/components/modals/connect/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { useCallback } from 'react'

type Props = {
  initialUri?: string
  isOpen: boolean
  onClose(): void
}

const Connect = ({ initialUri, isOpen, onClose }: Props) => {
  const { connect, wcAccountId } = useWalletConnect()
  const { pair } = useWalletConnectV2()

  const handleConnectV1 = useCallback(
    (uri: string) => {
      if (!wcAccountId) return
      const connectionResult = connect(uri, fromAccountId(wcAccountId).account)
      if (connectionResult?.successful) onClose()
    },
    [connect, onClose, wcAccountId],
  )

  const handleConnectV2 = useCallback(
    async (uri: string) => {
      const connectionResult = await pair?.({ uri })
      if (connectionResult) onClose()
    },
    [onClose, pair],
  )

  const handleConnect = useCallback(
    (uri: string) => {
      // https://eips.ethereum.org/EIPS/eip-1328
      const isWalletConnectV2 = isWalletConnectV2Uri(uri)
      return isWalletConnectV2 ? handleConnectV2(uri) : handleConnectV1(uri)
    },
    [handleConnectV1, handleConnectV2],
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
        <ModalCloseButton position='absolute' color='text.subtle' />
        <ConnectContent initialUri={initialUri} handleConnect={handleConnect} />
      </ModalContent>
    </Modal>
  )
}

export const ConnectModal = Connect
