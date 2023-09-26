import { Alert, AlertIcon, AlertTitle, Button, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { DAppInfo } from 'plugins/walletConnectToDapps/components/DAppInfo'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { Permissions } from 'plugins/walletConnectToDapps/components/Permissions'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/types'
import type { WalletConnectSessionModalProps } from 'plugins/walletConnectToDapps/WalletConnectModalManager'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { assertIsDefined } from 'lib/utils'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const checkAllNamespacesSupported = (
  namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
  wallet: HDWallet | null,
): boolean => {
  return Object.values(namespaces).every(
    namespace =>
      namespace.chains?.every(chainId =>
        // TODO(gomes): fix this
        walletSupportsChain({ chainId, wallet, isSnapInstalled: false }),
      ),
  )
}

const checkAllNamespacesHaveAccounts = (
  namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
  selectedAccountIds: AccountId[],
): boolean => {
  return Object.values(namespaces).every(
    namespace =>
      namespace.chains?.every(requiredChainId =>
        selectedAccountIds.some(accountId => {
          const { chainId: accountChainId } = fromAccountId(accountId)
          return requiredChainId === accountChainId
        }),
      ),
  )
}

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
  const { proposer, requiredNamespaces, optionalNamespaces } = params

  const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>([])
  const toggleAccountId = useCallback((accountId: string) => {
    setSelectedAccountIds(previousState =>
      previousState.includes(accountId)
        ? previousState.filter(existingAccountId => existingAccountId !== accountId)
        : [...previousState, accountId],
    )
  }, [])

  /*
  We need to pass an account for every supported namespace. If we can't, we cannot approve the session.
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#21-session-namespaces-must-not-have-accounts-empty
   */
  const allNamespacesSupported = useMemo(() => {
    const allRequiredNamespacesSupported = checkAllNamespacesSupported(requiredNamespaces, wallet)
    return allRequiredNamespacesSupported
  }, [requiredNamespaces, wallet])

  /*
  All namespaces require at least one account in the response payload
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#24-session-namespaces-must-contain-at-least-one-account-in-requested-chains
   */
  const allNamespacesHaveAccounts = useMemo(() => {
    const allRequiredNamespacesHaveAccounts = checkAllNamespacesHaveAccounts(
      requiredNamespaces,
      selectedAccountIds,
    )
    return allRequiredNamespacesHaveAccounts
  }, [requiredNamespaces, selectedAccountIds])

  const supportedOptionalNamespacesWithAccounts = useMemo(() => {
    return Object.fromEntries(
      Object.entries(optionalNamespaces)
        .map(([key, namespace]): [string, ProposalTypes.BaseRequiredNamespace] => {
          namespace.chains = namespace.chains?.filter(chainId => {
            const isRequired = requiredNamespaces[key].chains?.includes(chainId)
            const isSupported = walletSupportsChain({ chainId, wallet, isSnapInstalled: false })
            return !isRequired && isSupported
          })

          return [key, namespace]
        })
        .filter(([_key, namespace]) => {
          return namespace.chains && namespace.chains.length > 0
        }),
    )
  }, [optionalNamespaces, requiredNamespaces, wallet])

  const approvalNamespaces: SessionTypes.Namespaces = createApprovalNamespaces(
    requiredNamespaces,
    selectedAccountIds,
  )

  const handleApprove = useCallback(async () => {
    // exit if the proposal was not found - likely duplicate call rerendering shenanigans
    const pendingProposals = web3wallet.getPendingSessionProposals()
    if (
      !Object.values(pendingProposals).some(pendingProposal => pendingProposal.id === proposal.id)
    ) {
      return
    }

    const session = await web3wallet.approveSession({
      id: proposal.id,
      namespaces: approvalNamespaces,
    })
    dispatch({ type: WalletConnectActionType.ADD_SESSION, payload: session })
    handleClose()
  }, [approvalNamespaces, dispatch, handleClose, proposal, web3wallet])

  const handleReject = useCallback(async () => {
    await web3wallet.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED_METHODS'),
    })
    handleClose()
  }, [handleClose, id, web3wallet])

  const modalBody: JSX.Element = useMemo(() => {
    return allNamespacesSupported ? (
      <>
        <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.permissions'>
          <Alert status={allNamespacesHaveAccounts ? 'success' : 'warning'} mb={4} mt={-2}>
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
        {Object.keys(supportedOptionalNamespacesWithAccounts).length > 0 && (
          <ModalSection title='plugins.walletConnectToDapps.modal.sessionProposal.optionalPermissions'>
            <Alert status='info' mb={4} mt={-2}>
              <AlertIcon />
              <AlertTitle>
                <Text translation='plugins.walletConnectToDapps.modal.sessionProposal.optionalPermissionMessage' />
              </AlertTitle>
            </Alert>
            <Permissions
              requiredNamespaces={supportedOptionalNamespacesWithAccounts}
              selectedAccountIds={selectedAccountIds}
              toggleAccountId={toggleAccountId}
            />
          </ModalSection>
        )}
      </>
    ) : (
      <RawText>
        {translate('plugins.walletConnectToDapps.modal.sessionProposal.unsupportedChain')}
      </RawText>
    )
  }, [
    allNamespacesSupported,
    requiredNamespaces,
    selectedAccountIds,
    toggleAccountId,
    supportedOptionalNamespacesWithAccounts,
    allNamespacesHaveAccounts,
    translate,
  ])

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
            isDisabled={
              selectedAccountIds.length === 0 ||
              !allNamespacesSupported ||
              !allNamespacesHaveAccounts
            }
            _disabled={disabledProp}
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
