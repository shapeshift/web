import type { WalletKitTypes } from '@reown/walletkit'
import type { ChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'

import { AccountSelection } from '@/plugins/walletConnectToDapps/components/modals/AccountSelection'
import { SessionAuthRoutes } from '@/plugins/walletConnectToDapps/components/modals/SessionAuthRoutes'
import { SessionProposalOverview } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalOverview'
import { PeerMeta } from '@/plugins/walletConnectToDapps/components/PeerMeta'
import { MessageContent } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/content/MessageContent'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectSessionAuthModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const SessionAuthenticateConfirmation: FC<WalletConnectSessionAuthModalProps> = ({
  onConfirm,
  onReject,
  state,
}) => {
  const sessionAuthRequest = state.modalData?.request as
    | WalletKitTypes.EventArguments['session_authenticate']
    | undefined

  const { params } = sessionAuthRequest || {}
  const { authPayload: sessionAuthPayload, requester } = params || {}

  const [isLoading, setIsLoading] = useState(false)
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null)
  const [location, setLocation] = useLocation()

  const chainId = sessionAuthPayload?.chains?.[0] as ChainId | undefined

  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  if (selectedAccountNumber === null && uniqueAccountNumbers.length > 0) {
    setSelectedAccountNumber(uniqueAccountNumbers[0])
  }

  const accountId = useMemo(() => {
    if (!chainId || selectedAccountNumber === null) return undefined
    const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
    return accountsByChain?.[chainId]?.[0]
  }, [chainId, selectedAccountNumber, accountIdsByAccountNumberAndChainId])

  const canConnect = !!accountId && !!chainId
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

  const displayMessage = useMemo(() => {
    if (!sessionAuthPayload || !accountId || !state.web3wallet || !chainId)
      return 'Invalid authentication request'

    // Build DID:PKH identifier for SIWE message (accountId is already in chainId:address format)
    const iss = `did:pkh:${accountId}`

    try {
      const message = state.web3wallet.formatAuthMessage({
        request: sessionAuthPayload,
        iss,
      })
      return message
    } catch (error) {
      console.error('Error formatting session authentication message:', error)
      return 'Error formatting authentication message'
    }
  }, [sessionAuthPayload, accountId, state.web3wallet, chainId])

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

  if (!sessionAuthRequest) return null

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
            selectedNetworks={chainId ? [chainId] : []}
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
