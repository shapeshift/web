import { Alert, AlertIcon, AlertTitle, Button, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { DAppInfo } from 'plugins/walletConnectToDapps/v2/components/DAppInfo'
import { Permissions } from 'plugins/walletConnectToDapps/v2/components/Permissions'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import type { WalletConnectSessionModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { assertIsDefined } from 'lib/utils'

const allNamespacesSupported = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  wallet: HDWallet | null,
): boolean =>
  Object.values(requiredNamespaces).every(requiredNamespace =>
    requiredNamespace.chains?.every(chainId => walletSupportsChain({ chainId, wallet })),
  )

const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  selectedAccounts: string[],
): SessionTypes.Namespaces => {
  return Object.entries(requiredNamespaces).reduce(
    (namespaces: SessionTypes.Namespaces, [key, requiredNamespace]) => {
      const selectedAccountsForKey = selectedAccounts.filter(accountId => {
        const { chainNamespace } = fromAccountId(accountId)
        return chainNamespace === key
      })
      namespaces[key] = {
        accounts: selectedAccountsForKey,
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

  const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>(() => [])
  const toggleAccountId = (accountId: string) =>
    setSelectedAccountIds(previousState =>
      previousState.includes(accountId)
        ? previousState.filter(existingAccountId => existingAccountId !== accountId)
        : [...previousState, accountId],
    )

  /*
  We need to pass an account for every supported namespace. If we can't, we cannot approve the session.
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#21-session-namespaces-must-not-have-accounts-empty
   */
  const areAllNamespacesSupported = allNamespacesSupported(requiredNamespaces, wallet)

  /*
  All namespaces require at least one account in the response payload
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#24-session-namespaces-must-contain-at-least-one-account-in-requested-chains
   */
  const allNamespacesHaveAccounts = Object.values(requiredNamespaces).every(requiredNamespaces =>
    requiredNamespaces.chains?.every(requiredChainId =>
      selectedAccountIds.some(accountId => {
        const { chainId: accountChainId } = fromAccountId(accountId)
        return requiredChainId === accountChainId
      }),
    ),
  )

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

  const modalBody: JSX.Element = areAllNamespacesSupported ? (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.permissions'>
        <Alert status='warning' mb={4} mt={-2}>
          <AlertIcon />
          <AlertTitle>
            <Text translation='plugins.walletConnectToDapps.modal.sessionProposal.permissionMessage' />
          </AlertTitle>
        </Alert>
        <Permissions
          requiredNamespaces={requiredNamespaces}
          selectedAccountIds={selectedAccountIds}
          toggleAccountId={toggleAccountId}
        />
      </ModalSection>
    </>
  ) : (
    <RawText>
      {translate('plugins.walletConnectToDapps.modal.sessionProposal.unsupportedChain')}
    </RawText>
  )

  return (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.dAppInfo'>
        <DAppInfo metadata={proposer.metadata} />
      </ModalSection>
      {modalBody}
      <ModalSection title={''}>
        <VStack spacing={4}>
          <Button
            size='lg'
            width='full'
            colorScheme='blue'
            type='submit'
            onClick={handleApprove}
            disabled={
              selectedAccountIds.length === 0 ||
              !areAllNamespacesSupported ||
              !allNamespacesHaveAccounts
            }
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
