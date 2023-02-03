import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { SignClientTypes } from '@walletconnect/types'

type Props = {
  isOpen: boolean
  onClose(): void
  proposal: SignClientTypes.EventArguments['session_proposal']
}

const SessionProposal = ({ isOpen, onClose: handleClose, proposal }: Props) => {
  // Get required proposal data
  const { id, params } = proposal
  const { proposer, requiredNamespaces, relays } = params

  console.log('[debug] SessionProposal modal', {
    proposal,
    id,
    params,
    proposer,
    requiredNamespaces,
    relays,
  })

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant='header-nav'>
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
      </ModalContent>
    </Modal>
  )
}

export const SessionProposalModal = SessionProposal
