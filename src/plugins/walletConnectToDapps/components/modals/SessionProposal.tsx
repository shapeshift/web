import { Alert, AlertIcon, AlertTitle, Button, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { knownChainIds } from 'constants/chains'
import { mergeWith } from 'lodash'
import { DAppInfo } from 'plugins/walletConnectToDapps/components/DAppInfo'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { Permissions } from 'plugins/walletConnectToDapps/components/Permissions'
import type { SessionProposalRef } from 'plugins/walletConnectToDapps/types'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/types'
import type { WalletConnectSessionModalProps } from 'plugins/walletConnectToDapps/WalletConnectModalManager'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { assertIsDefined } from 'lib/utils'
import { selectAccountIdsByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

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

const _createApprovalNamespaces = (
  proposalNamespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
  selectedAccounts: string[],
): SessionTypes.Namespaces => {
  return Object.entries(proposalNamespaces).reduce(
    (namespaces: SessionTypes.Namespaces, [key, proposalNamespace]) => {
      const selectedAccountsForKey = selectedAccounts.filter(accountId => {
        const { chainNamespace } = fromAccountId(accountId)
        return chainNamespace === key
      })
      namespaces[key] = {
        accounts: selectedAccountsForKey,
        methods: proposalNamespace.methods,
        events: proposalNamespace.events,
      }
      return namespaces
    },
    {},
  )
}

const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccounts: string[],
): SessionTypes.Namespaces => {
  // tell lodash to concat array but merge everything else
  const concatArrays = (objValue: unknown, srcValue: unknown) => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return Array.from(new Set([...objValue, ...srcValue]))
    }
  }

  // do a deep merge of the optional and required namespace approval objects
  // but with a concat for the arrays so values stored on the same index aren't overwritten
  return mergeWith(
    _createApprovalNamespaces(requiredNamespaces, selectedAccounts),
    _createApprovalNamespaces(optionalNamespaces, selectedAccounts),
    concatArrays,
  )
}

const SessionProposal = forwardRef<SessionProposalRef, WalletConnectSessionModalProps>(
  (
    {
      onClose: handleClose,
      state: {
        modalData: { proposal },
        web3wallet,
      },
      dispatch,
    }: WalletConnectSessionModalProps,
    ref,
  ) => {
    assertIsDefined(proposal)

    const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

    const wallet = useWallet().state.wallet
    const translate = useTranslate()

    const { id, params } = proposal
    const { proposer, requiredNamespaces, optionalNamespaces } = params

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>([])
    const toggleAccountId = useCallback((accountId: string) => {
      setSelectedAccountIds(previousState =>
        previousState.includes(accountId)
          ? previousState.filter(existingAccountId => existingAccountId !== accountId)
          : [...previousState, accountId],
      )
    }, [])

    const checkAllNamespacesSupported = useCallback(
      (
        namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
        wallet: HDWallet | null,
      ): boolean =>
        Object.values(namespaces).every(
          namespace =>
            namespace.chains?.every(chainId => {
              return walletSupportsChain({
                chainId,
                wallet,
                isSnapInstalled: false,
                checkConnectedAccountIds: accountIdsByChainId[chainId] ?? [],
              })
            }),
        ),
      [accountIdsByChainId],
    )

    /*
  We need to pass an account for every supported namespace. If we can't, we cannot approve the session.
  https://docs.walletconnect.com/2.0/specs/clients/sign/session-namespaces#21-session-namespaces-must-not-have-accounts-empty
   */
    const allNamespacesSupported = useMemo(() => {
      const allRequiredNamespacesSupported = checkAllNamespacesSupported(requiredNamespaces, wallet)
      return allRequiredNamespacesSupported
    }, [checkAllNamespacesSupported, requiredNamespaces, wallet])

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
              const chainAccountIds = accountIdsByChainId[chainId] ?? []
              const isRequired = requiredNamespaces[key]?.chains?.includes(chainId)
              const isSupported =
                knownChainIds.includes(chainId as KnownChainIds) &&
                walletSupportsChain({
                  chainId,
                  wallet,
                  isSnapInstalled: false,
                  checkConnectedAccountIds: chainAccountIds,
                })
              return !isRequired && isSupported
            })

            return [key, namespace]
          })
          .filter(([_key, namespace]) => {
            return namespace.chains && namespace.chains.length > 0
          }),
      )
    }, [accountIdsByChainId, optionalNamespaces, requiredNamespaces, wallet])

    const approvalNamespaces: SessionTypes.Namespaces = useMemo(
      () => createApprovalNamespaces(requiredNamespaces, optionalNamespaces, selectedAccountIds),
      [optionalNamespaces, requiredNamespaces, selectedAccountIds],
    )

    const handleApprove = useCallback(async () => {
      // exit if the proposal was not found - likely duplicate call rerendering shenanigans
      const pendingProposals = web3wallet.getPendingSessionProposals()
      if (
        !Object.values(pendingProposals).some(pendingProposal => pendingProposal.id === proposal.id)
      ) {
        return
      }

      setIsLoading(true)

      const session = await web3wallet.approveSession({
        id: proposal.id,
        namespaces: approvalNamespaces,
      })
      dispatch({ type: WalletConnectActionType.ADD_SESSION, payload: session })
      handleClose()
    }, [approvalNamespaces, dispatch, handleClose, proposal, web3wallet])

    const handleReject = useCallback(async () => {
      setIsLoading(true)

      await web3wallet.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      })
    }, [id, web3wallet])

    const handleRejectAndClose = useCallback(async () => {
      await handleReject()
      handleClose()
    }, [handleClose, handleReject])

    // pass a reference to the reject function to the modal manager so it can reject on close
    useImperativeHandle(ref, () => ({
      handleReject,
    }))

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
              isLoading={isLoading}
            >
              {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
            </Button>
            <Button
              size='lg'
              width='full'
              onClick={handleRejectAndClose}
              isDisabled={isLoading}
              _disabled={disabledProp}
            >
              {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
            </Button>
          </VStack>
        </ModalSection>
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
