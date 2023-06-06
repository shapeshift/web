import type { SessionTypes } from '@walletconnect/types'
import type { Web3WalletTypes } from '@walletconnect/web3wallet'
import { useWalletConnectEventsHandler } from 'plugins/walletConnectToDapps/v2/eventsManager/useWalletConnectEventsHandler'
import type {
  SupportedSessionRequest,
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import {
  CosmosSigningMethod,
  EIP155_SigningMethod,
  WalletConnectActionType,
} from 'plugins/walletConnectToDapps/v2/types'
import { useEffect } from 'react'

export const isSupportedSessionRequest = (
  request: Web3WalletTypes.SessionRequest,
): request is SupportedSessionRequest => {
  const supportedMethods = [
    ...Object.values(EIP155_SigningMethod),
    ...Object.values(CosmosSigningMethod),
  ]
  return supportedMethods.some(value => value === request.params.request.method)
}

export const useWalletConnectEventsManager = (
  isInitialized: boolean,
  web3wallet: WalletConnectState['web3wallet'],
  dispatch: WalletConnectContextType['dispatch'],
  core: WalletConnectState['core'],
) => {
  const { handleSessionProposal, handleAuthRequest, handleSessionRequest } =
    useWalletConnectEventsHandler(dispatch, web3wallet)

  // Set up WalletConnect event listeners
  useEffect(() => {
    if (isInitialized && web3wallet && core) {
      const signClientEvents = web3wallet.engine.signClient.events
      const pairingEvents = core.pairing.events

      const sessionRequestListener = (request: Web3WalletTypes.SessionRequest) =>
        isSupportedSessionRequest(request) && handleSessionRequest(request)
      const sessionDeleteListener = () => dispatch({ type: WalletConnectActionType.DELETE_SESSION })
      const sessionUpdateListener = (session: Partial<SessionTypes.Struct>) =>
        dispatch({ type: WalletConnectActionType.UPDATE_SESSION, payload: session })
      const sessionPingListener = () => {}
      const pairingPingListener = () => {}

      const pairingDeleteListener = () => dispatch({ type: WalletConnectActionType.DELETE_SESSION })

      const pairingExpireListener = () => dispatch({ type: WalletConnectActionType.DELETE_SESSION })

      // Sign
      web3wallet.on('session_proposal', handleSessionProposal)
      web3wallet.on('session_request', sessionRequestListener)

      // Auth
      web3wallet.on('auth_request', handleAuthRequest)

      // Pairing
      pairingEvents.on('pairing_ping', pairingPingListener)
      pairingEvents.on('pairing_delete', pairingDeleteListener)
      pairingEvents.on('pairing_expire', pairingExpireListener)

      // Session
      signClientEvents.on('session_ping', sessionPingListener)
      signClientEvents.on('session_update', sessionUpdateListener)
      signClientEvents.on('session_delete', sessionDeleteListener)

      return () => {
        // Sign
        web3wallet.off('session_proposal', handleSessionProposal)
        web3wallet.off('session_request', sessionRequestListener)

        // Auth
        web3wallet.off('auth_request', handleAuthRequest)

        // Pairing
        pairingEvents.off('pairing_ping', pairingPingListener)
        pairingEvents.off('pairing_delete', pairingDeleteListener)
        pairingEvents.off('pairing_expire', pairingExpireListener)

        // Session
        signClientEvents.off('session_ping', sessionPingListener)
        signClientEvents.off('session_update', sessionUpdateListener)
        signClientEvents.off('session_delete', sessionDeleteListener)
      }
    }
  }, [
    handleSessionProposal,
    handleSessionRequest,
    handleAuthRequest,
    web3wallet,
    isInitialized,
    core,
    dispatch,
  ])
}
