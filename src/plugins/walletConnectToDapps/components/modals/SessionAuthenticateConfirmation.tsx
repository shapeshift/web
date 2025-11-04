import type { WalletKitTypes } from '@reown/walletkit'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'

import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { SessionAuthRoutes } from '@/plugins/walletConnectToDapps/components/modals/SessionAuthRoutes'
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

export const SessionAuthenticateConfirmation: FC<WalletConnectRequestModalProps<any>> = ({
  onConfirm,
  onReject,
  state,
}) => {
  const authRequest = state.modalData?.request as
    | WalletKitTypes.EventArguments['session_authenticate']
    | undefined

  const { params } = authRequest || {}
  const { authPayload, requester } = params || {}

  // All hooks must be called before any early returns
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)
  const [location, setLocation] = useLocation()

  const authChainId = useMemo(() => {
    const caipChainId = authPayload?.chains?.[0]
    if (!caipChainId) return undefined

    // Parse CAIP-2 chain ID (e.g., "eip155:8453")
    const [namespace, reference] = caipChainId.split(':')
    if (namespace !== 'eip155') return undefined

    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: reference as ChainReference,
    })
  }, [authPayload])

  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  // Initialize with first account if not set
  if (selectedAccountNumber === null && uniqueAccountNumbers.length > 0) {
    setSelectedAccountNumber(uniqueAccountNumbers[0])
  }

  const accountId = useMemo(() => {
    if (!authChainId || selectedAccountNumber === null) {
      return undefined
    }
    const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
    return accountsByChain?.[authChainId]?.[0]
  }, [authChainId, selectedAccountNumber, accountIdsByAccountNumberAndChainId])

  const canConnect = !!accountId && !!authChainId
  const handleAccountClick = useCallback(() => {
    if (uniqueAccountNumbers.length > 1) {
      setLocation(SessionAuthRoutes.ChooseAccount)
    }
  }, [uniqueAccountNumbers.length, setLocation])

  const handleBack = useCallback(() => {
    setLocation(SessionAuthRoutes.Overview)
  }, [setLocation])

  const handleAccountNumberChange = useCallback(
    (accountNumber: number) => {
      setSelectedAccountNumber(accountNumber)
      setLocation(SessionAuthRoutes.Overview)
    },
    [setLocation],
  )

  // Show the actual SIWE message that will be signed
  const displayMessage = useMemo(() => {
    if (!authPayload || !accountId || !state.web3wallet) return 'Invalid authentication request'

    const address = accountId.split(':')[2]
    const caipChainId = authPayload.chains?.[0]
    if (!address || !caipChainId) return 'Invalid authentication request'

    const iss = `did:pkh:${caipChainId}:${address}`

    try {
      const message = state.web3wallet.formatAuthMessage({
        request: authPayload,
        iss,
      })
      return message
    } catch (error) {
      console.error('Error formatting SIWE message:', error)
      return 'Error formatting authentication message'
    }
  }, [authPayload, accountId, state.web3wallet])

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      const customData: CustomTransactionData = {
        accountId,
      }
      await onConfirm(customData)
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm, accountId])

  const peerMetadata = requester?.metadata

  // Check for missing auth request after all hooks
  if (!authRequest) return null

  return (
    <>
      {location !== SessionAuthRoutes.ChooseAccount && peerMetadata && (
        <PeerMeta metadata={peerMetadata} />
      )}
      <Switch location={location}>
        <Route path={SessionAuthRoutes.ChooseAccount}>
          <AccountSelection
            selectedAccountNumber={selectedAccountNumber}
            onBack={handleBack}
            onAccountNumberChange={handleAccountNumberChange}
            onDone={handleBack}
          />
        </Route>
        <Route>
          <SessionProposalOverview
            selectedAccountNumber={selectedAccountNumber}
            selectedNetworks={authChainId ? [authChainId] : []}
            onAccountClick={handleAccountClick}
            onConnectSelected={handleConfirm}
            onReject={onReject}
            isLoading={isLoading}
            canConnect={canConnect}
          >
            <MessageContent message={displayMessage} />
          </SessionProposalOverview>
        </Route>
      </Switch>
    </>
  )
}
