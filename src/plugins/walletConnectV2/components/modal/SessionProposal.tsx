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
import type { ProposalTypes, SessionTypes, SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import type { IWeb3Wallet } from '@walletconnect/web3wallet'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modal/callRequest/methods/components/ModalSection'
import { AccountSelectionOverview } from 'plugins/walletConnectV2/components/AccountSelectionOverview'
import { DAppInfo } from 'plugins/walletConnectV2/components/DAppInfo'
import { Permissions } from 'plugins/walletConnectV2/components/Permissions'
import type { WalletConnectContextType } from 'plugins/walletConnectV2/types'
import { WalletConnectActionType } from 'plugins/walletConnectV2/types'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'

type Props = {
  isOpen: boolean
  onClose(): void
  proposal: SignClientTypes.EventArguments['session_proposal']
  web3wallet: IWeb3Wallet
  dispatch: WalletConnectContextType['dispatch']
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
        chains: requiredNamespace.chains?.filter(chainId =>
          walletSupportsChain({ chainId, wallet }),
        ),
      },
    }))
    .filter(({ requiredNamespace }) => (requiredNamespace.chains?.length ?? 0) > 0)
    .reduce((acc, { chainId, requiredNamespace }) => ({ ...acc, [chainId]: requiredNamespace }), {})

const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  selectedAccounts: string[],
): SessionTypes.Namespaces => {
  return Object.entries(requiredNamespaces).reduce(
    (namespaces: SessionTypes.Namespaces, [key, requiredNamespace]) => {
      // const accounts =
      //   requiredNamespace.chains?.map(chain => `${chain}:${selectedAccounts.join(',')}`) || []
      namespaces[key] = {
        accounts: selectedAccounts,
        methods: requiredNamespace.methods,
        events: requiredNamespace.events,
      }
      return namespaces
    },
    {},
  )
}

const SessionProposal: FC<Props> = ({
  isOpen,
  onClose: handleClose,
  proposal,
  web3wallet,
  dispatch,
}) => {
  const wallet = useWallet().state.wallet
  const translate = useTranslate()

  const { id, params } = proposal
  const { proposer, requiredNamespaces, relays } = params

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => [])
  const toggleAccountId = (accountId: string) =>
    setSelectedAccountIds(previousState =>
      previousState.includes(accountId)
        ? previousState.filter(existingAccountId => existingAccountId !== accountId)
        : [...previousState, accountId],
    )

  // TODO: Show an error if no namespaces are supported by the connect wallet
  const filteredNamespaces = filterSupportedNamespaces(proposal.params.requiredNamespaces, wallet)

  const approvalNamespaces: SessionTypes.Namespaces = createApprovalNamespaces(
    requiredNamespaces,
    selectedAccountIds,
  )

  const handleApprove = useCallback(async () => {
    const session = await web3wallet?.approveSession({
      id: proposal.id,
      namespaces: approvalNamespaces,
    })
    dispatch({ type: WalletConnectActionType.SET_SESSION, payload: { session } })
    console.log('[debug] SessionProposal modal session created!', { session })
    handleClose()
  }, [approvalNamespaces, dispatch, handleClose, proposal.id, web3wallet])

  const handleReject = useCallback(async () => {
    await web3wallet.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED_METHODS'),
    })
    handleClose()
  }, [handleClose, id, web3wallet])

  console.log('[debug] SessionProposal modal', {
    proposal,
    id,
    params,
    proposer,
    requiredNamespaces,
    relays,
    selectedAccountIds,
    approvalNamespaces,
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
