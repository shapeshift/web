import type { ChainId } from '@shapeshiftoss/caip'
import { toChainId, CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import type { WalletKitTypes } from '@reown/walletkit'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { SessionProposalOverview } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalOverview'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

enum SessionAuthRoutes {
  Overview = '/overview',
  ChooseAccount = '/choose-account',
}

export const SessionAuthenticateConfirmation: FC<
  WalletConnectRequestModalProps<any>
> = ({ onConfirm, onReject, state, topic }) => {
  console.log('[WC Auth Modal] Rendering SessionAuthenticateConfirmation')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Get the auth request from modal data
  const authRequest = state.modalData?.request as
    | WalletKitTypes.EventArguments['session_authenticate']
    | undefined

  if (!authRequest) {
    console.error('[WC Auth Modal] No auth request found in modal data!')
    return <div>No auth request data</div>
  }

  const { params } = authRequest || {}
  const { authPayload, requester } = params || {}

  console.log('[WC Auth Modal] Auth request found:', authRequest)
  console.log('[WC Auth Modal] Auth payload:', authPayload)
  console.log('[WC Auth Modal] Requester:', requester)

  // Extract chainId from auth payload (e.g., "eip155:8453" -> chainId)
  const authChainId = useMemo(() => {
    const caipChainId = authPayload?.chains?.[0]
    if (!caipChainId) return undefined

    // Parse CAIP-2 chain ID (e.g., "eip155:8453")
    const [namespace, reference] = caipChainId.split(':')
    if (namespace !== 'eip155') return undefined

    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: reference as any,
    })
  }, [authPayload])

  console.log('[WC Auth Modal] Extracted chainId:', authChainId)

  // Get unique account numbers and account mapping
  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  // Use first account number as default if none selected
  const effectiveAccountNumber = selectedAccountNumber ?? uniqueAccountNumbers[0]

  // Get the account ID for signing (from the selected account number + auth chain)
  const accountId = useMemo(() => {
    if (!authChainId || effectiveAccountNumber === null || effectiveAccountNumber === undefined) {
      return undefined
    }
    const accountsByChain = accountIdsByAccountNumberAndChainId[effectiveAccountNumber]
    return accountsByChain?.[authChainId]?.[0]
  }, [authChainId, effectiveAccountNumber, accountIdsByAccountNumberAndChainId])

  // Determine if we can connect
  const canConnect = useMemo(() => {
    return !!accountId && !!authChainId
  }, [accountId, authChainId])

  console.log('[WC Auth Modal] Selected account number:', effectiveAccountNumber)
  console.log('[WC Auth Modal] Account ID for signing:', accountId)
  console.log('[WC Auth Modal] Can connect:', canConnect)

  // Navigation handlers
  const handleAccountClick = useCallback(() => {
    if (uniqueAccountNumbers.length > 1) {
      navigate(SessionAuthRoutes.ChooseAccount)
    }
  }, [uniqueAccountNumbers.length, navigate])

  const handleBack = useCallback(() => {
    navigate(SessionAuthRoutes.Overview)
  }, [navigate])

  const handleAccountNumberChange = useCallback((accountNumber: number) => {
    setSelectedAccountNumber(accountNumber)
    navigate(SessionAuthRoutes.Overview)
  }, [navigate])

  // Format the SIWE message for display
  const displayMessage = useMemo(() => {
    if (!authPayload) {
      console.error('[WC Auth Modal] No auth payload!')
      return 'Invalid authentication request'
    }
    const statement = authPayload.statement || 'Sign in with your wallet'
    const domain = authPayload.domain || 'Unknown domain'
    const chainInfo = authPayload.chains?.[0] || 'Unknown chain'

    const message = `${domain} wants you to sign in.\n\n${statement}\n\nChain: ${chainInfo}`
    console.log('[WC Auth Modal] Display message:', message)
    return message
  }, [authPayload])

  const handleConfirm = useCallback(
    async () => {
      console.log('[WC Auth Modal] Confirm clicked')
      console.log('[WC Auth Modal] Using account for signing:', accountId)

      setIsLoading(true)
      try {
        // Pass the account ID to the confirm handler
        const customData: CustomTransactionData = {
          accountId
        }
        await onConfirm(customData)
      } finally {
        setIsLoading(false)
      }
    },
    [onConfirm, accountId],
  )

  const handleReject = useCallback(
    async () => {
      console.log('[WC Auth Modal] Reject clicked')
      await onReject()
    },
    [onReject],
  )

  // Use requester metadata for peer info
  const peerMetadata = requester?.metadata

  const overview = (
    <SessionProposalOverview
      selectedAccountNumber={effectiveAccountNumber}
      selectedNetworks={authChainId ? [authChainId] : []}
      onAccountClick={handleAccountClick}
      onConnectSelected={handleConfirm}
      onReject={handleReject}
      isLoading={isLoading}
      canConnect={canConnect}
      hideNetworkSelection={true}
    >
      <MessageContent message={displayMessage} />
    </SessionProposalOverview>
  )

  return (
    <>
      {location.pathname === SessionAuthRoutes.Overview && peerMetadata && (
        <PeerMeta metadata={peerMetadata} />
      )}
      <Switch location={location.pathname}>
        <Route path={SessionAuthRoutes.ChooseAccount}>
          <AccountSelection
            selectedAccountNumber={effectiveAccountNumber}
            onBack={handleBack}
            onAccountNumberChange={handleAccountNumberChange}
            onDone={handleBack}
          />
        </Route>
        <Route path={SessionAuthRoutes.Overview}>{overview}</Route>
        <Route path='/'>{overview}</Route>
      </Switch>
    </>
  )
}