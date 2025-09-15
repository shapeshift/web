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
import { useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { RawText } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { assertIsDefined } from '@/lib/utils'
import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'
import { NetworkSelection } from '@/plugins/walletConnectToDapps/components/modals/NetworkSelection'
import { SessionProposalOverview } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalOverview'
import { SessionProposalRoutes } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalRoutes'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
import type { SessionProposalRef } from '@/plugins/walletConnectToDapps/types'
import { WalletConnectActionType } from '@/plugins/walletConnectToDapps/types'
import { createApprovalNamespaces } from '@/plugins/walletConnectToDapps/utils/createApprovalNamespaces'
import type { WalletConnectSessionModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

export const entries = Object.values(SessionProposalRoutes)

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
    const location = useLocation()
    const navigate = useNavigate()
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

    const handleAccountClick = useCallback(() => {
      navigate(SessionProposalRoutes.ChooseAccount)
    }, [navigate])

    const handleNetworkClick = useCallback(() => {
      navigate(SessionProposalRoutes.ChooseNetwork)
    }, [navigate])

    const handleAccountNumberChange = useCallback((accountNumber: number) => {
      setSelectedAccountNumber(accountNumber)
    }, [])

    const handleBack = useCallback(() => navigate(-1), [navigate])

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

    const overview = useMemo(
      () => (
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
      ),
      [
        modalBody,
        selectedAccountNumber,
        uniqueAccountNumbers,
        selectedChainIds,
        handleAccountClick,
        handleNetworkClick,
        handleConnectSelected,
        handleRejectAndClose,
        isLoading,
        selectedAccountIds.length,
        allNamespacesSupported,
        requiredChainIds,
        translate,
      ],
    )

    const accountSelection = useMemo(
      () => (
        <AccountSelection
          selectedAccountNumber={selectedAccountNumber}
          onAccountNumberChange={handleAccountNumberChange}
          onBack={handleBack}
          onDone={handleBack}
        />
      ),
      [selectedAccountNumber, handleAccountNumberChange, handleBack],
    )

    const networkSelection = useMemo(
      () => (
        <NetworkSelection
          selectedChainIds={selectedChainIds}
          requiredChainIds={requiredChainIds}
          selectedAccountNumber={selectedAccountNumber}
          requiredNamespaces={requiredNamespaces}
          onSelectedChainIdsChange={handleChainIdsChange}
          onBack={handleBack}
          onDone={handleBack}
        />
      ),
      [
        selectedChainIds,
        requiredChainIds,
        selectedAccountNumber,
        requiredNamespaces,
        handleChainIdsChange,
        handleBack,
      ],
    )

    return (
      <>
        {location.pathname === SessionProposalRoutes.Overview && proposer.metadata && (
          <PeerMeta metadata={proposer.metadata} py={0} />
        )}
        <Switch location={location.pathname}>
          <Route path={SessionProposalRoutes.Overview}>{overview}</Route>
          <Route path={SessionProposalRoutes.ChooseAccount}>{accountSelection}</Route>
          <Route path={SessionProposalRoutes.ChooseNetwork}>{networkSelection}</Route>
          <Route path='/'>{overview}</Route>
        </Switch>
      </>
    )
  },
)

export const SessionProposalModal = SessionProposal
