import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { ConnectContent } from 'plugins/walletConnectToDapps/components/modals/connect/ConnectContent'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/WalletConnectV2Provider'
import { useCallback } from 'react'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

type Props = {
  initialUri?: string
  isOpen: boolean
  onClose(): void
}

const borderRadiusProp = { base: 0, md: 'xl' }
const minWidthProp = { base: '100%', md: '500px' }
const maxWidthProp = { base: 'full', md: '500px' }

const Connect = ({ initialUri, isOpen, onClose }: Props) => {
  const { pair } = useWalletConnectV2()

  const handleConnectV2 = useCallback(
    async (uri: string) => {
      try {
        const connectionResult = await pair?.({ uri })
        if (connectionResult) onClose()
      } catch (error: unknown) {
        console.debug(error)
        getMixPanel()?.track(MixPanelEvent.Error, { error })
      }
    },
    [onClose, pair],
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        textAlign='center'
        p={0}
        borderRadius={borderRadiusProp}
        minWidth={minWidthProp}
        maxWidth={maxWidthProp}
      >
        <ModalCloseButton position='absolute' color='text.subtle' />
        <ConnectContent initialUri={initialUri} handleConnect={handleConnectV2} />
      </ModalContent>
    </Modal>
  )
}

export const ConnectModal = Connect
