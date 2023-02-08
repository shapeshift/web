import {
  Button,
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
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
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
    .map(([chainId, requiredNamespace]) => ({
      chainId,
      requiredNamespace: {
        ...requiredNamespace,
        chains: requiredNamespace.chains.filter(chainId =>
          walletSupportsChain({ chainId, wallet }),
        ),
      },
    }))
    .filter(({ requiredNamespace }) => requiredNamespace.chains.length > 0)
    .reduce((acc, { chainId, requiredNamespace }) => ({ ...acc, [chainId]: requiredNamespace }), {})

const SessionProposal: FC<Props> = ({ isOpen, onClose: handleClose, proposal }) => {
  const wallet = useWallet().state.wallet
  const translate = useTranslate()

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => [])
  const toggleAccountId = (accountId: string) =>
    setSelectedAccountIds(previousState =>
      previousState.includes(accountId)
        ? previousState.filter(existingAccountId => existingAccountId !== accountId)
        : [...previousState, accountId],
    )

  const handleApprove = () => {}
  const handleReject = () => {}

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
            <AccountSelectionOverview
              requiredNamespaces={filteredNamespaces}
              selectedAccountIds={selectedAccountIds}
              toggleAccountId={toggleAccountId}
            />
          </ModalSection>
          <ModalSection title={''}>
            <VStack spacing={4}>
              <Button
                size='lg'
                width='full'
                colorScheme='blue'
                type='submit'
                onClick={handleApprove}
                disabled={selectedAccountIds.length === 0}
              >
                {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
              </Button>
              <Button size='lg' width='full' onClick={handleReject}>
                {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
              </Button>
            </VStack>
          </ModalSection>
        </VStack>
      </ModalContent>
    </Modal>
  )
}

export const SessionProposalModal = SessionProposal
