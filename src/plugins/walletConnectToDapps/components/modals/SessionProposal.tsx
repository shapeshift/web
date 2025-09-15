import { VStack } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { uniq } from 'lodash'
import type { JSX } from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { assertIsDefined } from '@/lib/utils'
import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'
import { NetworkSelection } from '@/plugins/walletConnectToDapps/components/modals/NetworkSelection'
import { SessionProposalOverview } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalOverview'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
import type { SessionProposalRef } from '@/plugins/walletConnectToDapps/types'
import { WalletConnectActionType } from '@/plugins/walletConnectToDapps/types'
import { createApprovalNamespaces } from '@/plugins/walletConnectToDapps/utils/createApprovalNamespaces'
import type { WalletConnectSessionModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectAccountIdsByAccountNumberAndChainId, selectUniqueEvmAccountNumbers } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

type SessionProposalStep = 'overview' | 'choose-account' | 'choose-network'


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

    const accountIdsByAccountNumberAndChainId = useAppSelector(
      selectAccountIdsByAccountNumberAndChainId,
    )

    const wallet = useWallet().state.wallet
    const translate = useTranslate()

    const { id, params } = proposal
    const { proposer, requiredNamespaces, optionalNamespaces } = params

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>([])
    const [currentStep, setCurrentStep] = useState<SessionProposalStep>('overview')
    const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)

    const selectedChainIds = useMemo(
      () => uniq(selectedAccountIds.map(id => fromAccountId(id).chainId)),
      [selectedAccountIds],
    )


    const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)

    const selectedAccountIds_computed = useMemo(() => {
      if (selectedAccountNumber === null) return []
      const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
      if (!accountsByChain) return []

      return Object.entries(accountsByChain)
        .filter(([chainId]) => chainId.startsWith('eip155:'))
        .flatMap(([, accountIds]) => accountIds ?? [])
        .filter((id): id is AccountId => Boolean(id))
    }, [selectedAccountNumber, accountIdsByAccountNumberAndChainId])

    const requiredChainIds = useMemo(
      () => Object.values(requiredNamespaces).flatMap(namespace => namespace.chains ?? []),
      [requiredNamespaces],
    )

    // Initialize with first account number
    useEffect(() => {
      if (uniqueAccountNumbers.length > 0 && selectedAccountNumber === null) {
        const firstAccountNumber = uniqueAccountNumbers[0]
        setSelectedAccountNumber(firstAccountNumber)
      }
    }, [uniqueAccountNumbers, selectedAccountNumber])

    // Update selectedAccountIds when selectedAccountNumber changes
    useEffect(() => {
      setSelectedAccountIds(selectedAccountIds_computed)
    }, [selectedAccountIds_computed])

    useEffect(() => {}, [currentStep])

    const handleAccountClick = useCallback(() => {
      setCurrentStep('choose-account')
    }, [])

    const handleNetworkClick = useCallback(() => {
      setCurrentStep('choose-network')
    }, [])

    const handleAccountNumberChange = useCallback((accountNumber: number) => {
      setSelectedAccountNumber(accountNumber)
    }, [])

    const handleBackToOverview = useCallback(() => setCurrentStep('overview'), [])

    const handleChainIdsChange = useCallback(
      (chainIds: ChainId[]) => {
        if (selectedAccountNumber !== null) {
          const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
          if (accountsByChain) {
            // Only include EVM chains for WalletConnect
            const filteredAccountIds = chainIds
              .filter(chainId => chainId.startsWith('eip155:'))
              .flatMap(chainId => accountsByChain[chainId] ?? [])
              .filter((id): id is AccountId => Boolean(id))
            setSelectedAccountIds(filteredAccountIds)
          }
        }
      },
      [selectedAccountNumber, accountIdsByAccountNumberAndChainId],
    )

    const checkAllNamespacesSupported = useCallback(
      (
        namespaces: ProposalTypes.RequiredNamespaces | ProposalTypes.OptionalNamespaces,
        wallet: HDWallet | null,
      ): boolean =>
        Object.values(namespaces).every(
          namespace =>
            namespace.chains?.every(chainId => {
              // Only check EVM chains for WalletConnect
              if (!chainId.startsWith('eip155:')) return false

              // Check if any account number has this chain
              const hasChainInAnyAccount = Object.values(accountIdsByAccountNumberAndChainId).some(
                accountsByChain => {
                  if (!accountsByChain) return false
                  const chainAccounts = accountsByChain[chainId]
                  return chainAccounts ? chainAccounts.length > 0 : false
                },
              )
              if (!hasChainInAnyAccount) return false

              return walletSupportsChain({
                chainId,
                wallet,
                isSnapInstalled: false,
                checkConnectedAccountIds: Object.values(
                  accountIdsByAccountNumberAndChainId,
                ).flatMap(accountsByChain =>
                  accountsByChain && chainId in accountsByChain
                    ? accountsByChain[chainId] ?? []
                    : [],
                ),
              })
            }),
        ),
      [accountIdsByAccountNumberAndChainId],
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

    const handleConnectAccountIds = useCallback(
      async (_selectedAccountIds: AccountId[]) => {
        // First check if proposal is still valid
        const pendingProposals = web3wallet.getPendingSessionProposals()
        const isProposalValid = Object.values(pendingProposals).some(
          pendingProposal => pendingProposal.id === proposal.id,
        )

        if (!isProposalValid) {
          return
        }

        const approvalNamespaces: SessionTypes.Namespaces = createApprovalNamespaces(
          requiredNamespaces,
          optionalNamespaces || {},
          _selectedAccountIds,
          selectedChainIds,
        )

        setIsLoading(true)

        const session = await web3wallet.approveSession({
          id: proposal.id,
          namespaces: approvalNamespaces,
        })
        dispatch({ type: WalletConnectActionType.ADD_SESSION, payload: session })
        handleClose()
      },
      [
        dispatch,
        handleClose,
        proposal,
        web3wallet,
        requiredNamespaces,
        optionalNamespaces,
        selectedChainIds,
      ],
    )

    const handleConnectSelected = useCallback(
      () => handleConnectAccountIds(selectedAccountIds),
      [handleConnectAccountIds, selectedAccountIds],
    )

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
        <VStack spacing={0}></VStack>
      ) : (
        <ModalSection title=''>
          <RawText textAlign='center' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.sessionProposal.unsupportedChain')}
          </RawText>
        </ModalSection>
      )
    }, [allNamespacesSupported, translate])

    // Render current step
    const renderCurrentStep = () => {
      switch (currentStep) {
        case 'overview':
          return (
            <SessionProposalOverview
              modalBody={modalBody}
              selectedAccountNumber={selectedAccountNumber}
              uniqueAccountNumbers={uniqueAccountNumbers}
              selectedNetworks={selectedChainIds}
              onAccountClick={handleAccountClick}
              onNetworkClick={handleNetworkClick}
              onConnectSelected={handleConnectSelected}
              onReject={handleRejectAndClose}
              isLoading={isLoading}
              canConnect={
                selectedAccountIds.length > 0 &&
                allNamespacesSupported &&
                requiredChainIds.every(chainId => selectedChainIds.includes(chainId))
              }
              translate={translate}
            />
          )
        case 'choose-account':
          return (
            <AccountSelection
              selectedAccountNumber={selectedAccountNumber}
              onAccountNumberChange={handleAccountNumberChange}
              onBack={handleBackToOverview}
              onDone={handleBackToOverview}
            />
          )
        case 'choose-network':
          return (
            <NetworkSelection
              selectedChainIds={selectedChainIds}
              requiredChainIds={requiredChainIds}
              selectedAccountNumber={selectedAccountNumber}
              requiredNamespaces={requiredNamespaces}
              onSelectedChainIdsChange={handleChainIdsChange}
              onBack={handleBackToOverview}
              onDone={handleBackToOverview}
            />
          )
        default:
          return null
      }
    }

    return (
      <>
        {currentStep === 'overview' && proposer.metadata && (
          <PeerMeta metadata={proposer.metadata} py={0} />
        )}
        {renderCurrentStep()}
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
