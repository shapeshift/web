import { Modal, ModalContent } from '@chakra-ui/modal'
import { HStack, ModalCloseButton, ModalHeader, ModalOverlay, VStack } from '@chakra-ui/react'
import { SessionProposalModal } from 'plugins/walletConnectToDapps/v2/components/modals/SessionProposal'
import { SignMessageConfirmationModal } from 'plugins/walletConnectToDapps/v2/components/modals/SignMessageConfirmation'
import type {
  WalletConnectAction,
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType, WalletConnectModal } from 'plugins/walletConnectToDapps/v2/types'
import type { Dispatch, FC } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { assertUnreachable } from 'lib/utils'

type WalletConnectModalManagerProps = WalletConnectContextType

export type WalletConnectModalProps = {
  dispatch: Dispatch<WalletConnectAction>
  state: Required<WalletConnectState>
  onClose(): void
}

const isRequiredWalletConnectState = (
  state: WalletConnectState,
): state is Required<WalletConnectState> => {
  return !!(state.modalData && state.web3wallet && state.activeModal && state.session)
}

export const WalletConnectModalManager: FC<WalletConnectModalManagerProps> = ({
  state,
  dispatch,
}) => {
  const { activeModal, web3wallet } = state
  const handleClose = () => dispatch({ type: WalletConnectActionType.CLEAR_MODAL })

  if (!web3wallet || !activeModal || !isRequiredWalletConnectState(state)) return null

  const modalContent = (() => {
    switch (activeModal) {
      case WalletConnectModal.sessionProposal:
        return <SessionProposalModal onClose={handleClose} dispatch={dispatch} state={state} />
      case WalletConnectModal.signMessageConfirmation:
        return (
          <SignMessageConfirmationModal onClose={handleClose} dispatch={dispatch} state={state} />
        )
      default:
        assertUnreachable(activeModal)
    }
  })()

  const modalWrapper = (content: JSX.Element) => (
    <Modal isOpen={!!activeModal} onClose={handleClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalHeader py={2}>
          <HStack alignItems='center' spacing={2}>
            <WalletConnectIcon />
            <Text fontSize='md' translation='plugins.walletConnectToDapps.modal.title' flex={1} />
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        <VStack p={6} spacing={6} alignItems='stretch'>
          {content}
        </VStack>
      </ModalContent>
    </Modal>
  )

  return modalWrapper(modalContent)
}
