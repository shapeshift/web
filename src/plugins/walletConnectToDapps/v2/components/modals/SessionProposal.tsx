import { Button, VStack } from '@chakra-ui/react'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { AccountSelectionOverview } from 'plugins/walletConnectToDapps/v2/components/AccountSelectionOverview'
import { DAppInfo } from 'plugins/walletConnectToDapps/v2/components/DAppInfo'
import { Permissions } from 'plugins/walletConnectToDapps/v2/components/Permissions'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import type { WalletConnectSessionModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { assertIsDefined } from 'lib/utils'

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

const SessionProposal: FC<WalletConnectSessionModalProps> = ({
  onClose: handleClose,
  state: {
    modalData: { proposal },
    web3wallet,
  },
  dispatch,
}) => {
  assertIsDefined(proposal)

  const wallet = useWallet().state.wallet
  const translate = useTranslate()

  const { id, params } = proposal
  const { proposer, requiredNamespaces } = params

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
    dispatch({ type: WalletConnectActionType.SET_SESSION, payload: session })
    handleClose()
  }, [approvalNamespaces, dispatch, handleClose, proposal, web3wallet])

  const handleReject = useCallback(async () => {
    await web3wallet.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED_METHODS'),
    })
    handleClose()
  }, [handleClose, id, web3wallet])

  return (
    <>
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
    </>
  )
}

export const SessionProposalModal = SessionProposal
