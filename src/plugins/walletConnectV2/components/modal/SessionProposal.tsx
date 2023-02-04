import {
  HStack,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react'
import type { SignClientTypes } from '@walletconnect/types'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modal/callRequest/methods/components/ModalSection'
import { DAppInfo } from 'plugins/walletConnectV2/components/DAppInfo'
import { Permissions } from 'plugins/walletConnectV2/components/Permissions'
import type { FC } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

type Props = {
  isOpen: boolean
  onClose(): void
  proposal: SignClientTypes.EventArguments['session_proposal']
}

const SessionProposal: FC<Props> = ({ isOpen, onClose: handleClose, proposal }) => {
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
          <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.dAppInfo'>
            <DAppInfo metadata={proposer.metadata} />
          </ModalSection>
          <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.permissions'>
            <Permissions requiredNamespaces={requiredNamespaces} />
          </ModalSection>
        </VStack>
      </ModalContent>
    </Modal>
  )
}

export const SessionProposalModal = SessionProposal
