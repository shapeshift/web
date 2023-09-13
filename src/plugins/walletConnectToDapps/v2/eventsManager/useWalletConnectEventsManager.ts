import type { PairingJsonRpcTypes, SignClientTypes } from '@walletconnect/types'
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

// any type ok here because we're only pulling out the topic
type PairingEvent = Pick<PairingJsonRpcTypes.EventCallback<any>, 'topic'>

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

      const sessionRequestListener = (
        request: SignClientTypes.EventArguments['session_request'],
      ) => {
        isSupportedSessionRequest(request) && handleSessionRequest(request)
      }
      const sessionDeleteListener = ({
        topic,
      }: SignClientTypes.EventArguments['session_delete']) => {
        dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: { topic } })
      }
      const sessionUpdateListener = ({
        topic,
        params,
      }: SignClientTypes.EventArguments['session_update']) => {
        dispatch({ type: WalletConnectActionType.UPDATE_SESSION, payload: { ...params, topic } })
      }
      const sessionPingListener = () => {}
      const pairingPingListener = () => {}

      const pairingDeleteListener = ({ topic }: PairingEvent) => {
        dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: { topic } })
      }

      const pairingExpireListener = ({ topic }: PairingEvent) => {
        dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: { topic } })
      }

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
