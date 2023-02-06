import {
  HStack,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ProposalTypes, SignClientTypes } from '@walletconnect/types'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modal/callRequest/methods/components/ModalSection'
import { AccountSelectionOverview } from 'plugins/walletConnectV2/components/AccountSelectionOverview'
import { DAppInfo } from 'plugins/walletConnectV2/components/DAppInfo'
import { Permissions } from 'plugins/walletConnectV2/components/Permissions'
import type { FC } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'

type Props = {
  isOpen: boolean
  onClose(): void
  proposal: SignClientTypes.EventArguments['session_proposal']
}

// Filter out namespace chainIds that are not supported by the currently connected wallet
const filterSupportedNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  wallet: HDWallet | null,
): ProposalTypes.RequiredNamespaces =>
  Object.entries(requiredNamespaces)
    .map(([key, value]) => ({
      key,
      value: {
        ...value,
        chains: value.chains.filter(chainId => walletSupportsChain({ chainId, wallet })),
      },
    }))
    .filter(({ value }) => value.chains.length > 0)
    .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {})

const SessionProposal: FC<Props> = ({ isOpen, onClose: handleClose, proposal }) => {
  const wallet = useWallet().state.wallet
  // TODO: Show an error if no namespaces are supported by the connect wallet
  const filteredNamespaces = filterSupportedNamespaces(proposal.params.requiredNamespaces, wallet)

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
            <Permissions requiredNamespaces={filteredNamespaces} />
          </ModalSection>
          <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.accountSelection'>
            <AccountSelectionOverview requiredNamespaces={filteredNamespaces} />
          </ModalSection>
        </VStack>
      </ModalContent>
    </Modal>
  )
}

export const SessionProposalModal = SessionProposal
