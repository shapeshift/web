import type { WalletKitTypes } from '@reown/walletkit'
import type { ChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

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
  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(() =>
    uniqueAccountNumbers.length > 0 ? uniqueAccountNumbers[0] : null,
  )
  const location = useLocation()
  const navigate = useNavigate()

  const chainId = sessionAuthPayload?.chains?.[0] as ChainId | undefined

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const accountId = useMemo(() => {
    if (!chainId || selectedAccountNumber === null) return
    const accountsByChain = accountIdsByAccountNumberAndChainId[selectedAccountNumber]
    return accountsByChain?.[chainId]?.[0]
  }, [chainId, selectedAccountNumber, accountIdsByAccountNumberAndChainId])

  const canConnect = useMemo(() => !!accountId && !!chainId, [accountId, chainId])
  const handleAccountClick = useCallback(() => {
    navigate(SessionAuthRoutes.ChooseAccount)
  }, [navigate])

  const handleBack = useCallback(() => navigate(-1), [navigate])

  const handleAccountNumberChange = useCallback(
    (accountNumber: number) => {
      setSelectedAccountNumber(accountNumber)
      navigate(SessionAuthRoutes.Overview)
    },
    [navigate],
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
    } catch (error) {
      console.error('Error confirming session authentication:', error)
      // Re-throw to let the parent handle the error if needed
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm, accountId])

  const peerMetadata = requester?.metadata

  const peerMetaElement = useMemo(() => {
    if (location.pathname === SessionAuthRoutes.ChooseAccount || !peerMetadata) return null
    return <PeerMeta metadata={peerMetadata} />
  }, [location.pathname, peerMetadata])

  if (!sessionAuthRequest) return null

  return (
    <>
      {peerMetaElement}
      <Switch location={location.pathname}>
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
            hideNetworkSelection={true}
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
