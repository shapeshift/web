import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { uniq } from 'lodash'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { assertIsDefined } from '@/lib/utils'
import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
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

    const { id, params } = proposal
    const { proposer, requiredNamespaces, optionalNamespaces } = params

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [selectedAccountIds, setSelectedAccountIds] = useState<AccountId[]>([])
    const location = useLocation()
    const navigate = useNavigate()
    const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)

    const selectedChainIds = useMemo(
      () => uniq(selectedAccountIds.map(chainId => fromAccountId(chainId).chainId)),
      [selectedAccountIds],
    )

    const uniqueEvmAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)

    const requiredChainIds = useMemo(
      () => Object.values(requiredNamespaces).flatMap(namespace => namespace.chains ?? []),
      [requiredNamespaces],
    )

    const selectedAccountNumberAccountIdsByChainId = useMemo(() => {
      if (selectedAccountNumber === null) return null
      return accountIdsByAccountNumberAndChainId[selectedAccountNumber] ?? null
    }, [selectedAccountNumber, accountIdsByAccountNumberAndChainId])

    useEffect(() => {
      if (uniqueEvmAccountNumbers.length > 0 && selectedAccountNumber === null) {
        const firstAccountNumber = uniqueEvmAccountNumbers[0]
        setSelectedAccountNumber(firstAccountNumber)
      }
    }, [uniqueEvmAccountNumbers, selectedAccountNumber])

    useEffect(() => {
      if (!selectedAccountNumberAccountIdsByChainId) {
        setSelectedAccountIds([])
        return
      }

      const accountIds = Object.entries(selectedAccountNumberAccountIdsByChainId)
        .filter(([chainId]) => isEvmChainId(chainId))
        .flatMap(([, accountIds]) => accountIds ?? [])
        .filter((id): id is AccountId => Boolean(id))

      setSelectedAccountIds(accountIds)
    }, [selectedAccountNumberAccountIdsByChainId])

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
        if (!selectedAccountNumberAccountIdsByChainId) return

        const filteredAccountIds = chainIds
          .filter(isEvmChainId)
          .flatMap(chainId => selectedAccountNumberAccountIdsByChainId[chainId] ?? [])
          .filter((id): id is AccountId => Boolean(id))
        setSelectedAccountIds(filteredAccountIds)
      },
      [selectedAccountNumberAccountIdsByChainId],
    )

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
          optionalNamespaces,
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

    const handleConnectSelected = useCallback(
      () => handleConnectAccountIds(selectedAccountIds),
      [handleConnectAccountIds, selectedAccountIds],
    )

    // pass a reference to the reject function to the modal manager so it can reject on close
    useImperativeHandle(ref, () => ({
      handleReject,
    }))

    const overview = useMemo(
      () => (
        <SessionProposalOverview
          requiredNamespaces={requiredNamespaces}
          selectedAccountNumber={selectedAccountNumber}
          selectedNetworks={selectedChainIds}
          onAccountClick={handleAccountClick}
          onNetworkClick={handleNetworkClick}
          onConnectSelected={handleConnectSelected}
          onReject={handleRejectAndClose}
          isLoading={isLoading}
          canConnect={
            selectedAccountIds.length > 0 &&
            requiredChainIds.every(chainId => selectedChainIds.includes(chainId))
          }
        />
      ),
      [
        requiredNamespaces,
        selectedAccountNumber,
        selectedChainIds,
        handleAccountClick,
        handleNetworkClick,
        handleConnectSelected,
        handleRejectAndClose,
        isLoading,
        selectedAccountIds.length,
        requiredChainIds,
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
      () =>
        selectedAccountNumber === null ? null : (
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
