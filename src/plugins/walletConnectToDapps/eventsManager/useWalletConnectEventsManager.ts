import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { WalletKitTypes } from '@reown/walletkit'
import type { PairingJsonRpcTypes, SignClientTypes } from '@walletconnect/types'
import { useCallback, useEffect, useMemo } from 'react'

import { useWalletConnectEventsHandler } from '@/plugins/walletConnectToDapps/eventsManager/useWalletConnectEventsHandler'
import type {
  SupportedSessionRequest,
  WalletConnectContextType,
  WalletConnectState,
} from '@/plugins/walletConnectToDapps/types'
import {
  CosmosSigningMethod,
  EIP155_SigningMethod,
  WalletConnectActionType,
} from '@/plugins/walletConnectToDapps/types'

// any type ok here because we're only pulling out the topic
type PairingEvent = Pick<PairingJsonRpcTypes.EventCallback<any>, 'topic'>

export const isSupportedSessionRequest = (
  request: WalletKitTypes.SessionRequest,
): request is SupportedSessionRequest => {
  const supportedMethods = [
    ...Object.values(EIP155_SigningMethod),
    ...Object.values(CosmosSigningMethod),
  ]
  return supportedMethods.some(value => value === request.params.request.method)
}

export const useWalletConnectEventsManager = (
  state: WalletConnectState,
  dispatch: WalletConnectContextType['dispatch'],
) => {
  const { handleSessionProposal, handleAuthRequest, handleSessionRequest } =
    useWalletConnectEventsHandler(dispatch, state.web3wallet)

  const signClientEvents = useMemo(() => state.web3wallet?.engine.signClient.events, [state])
  const pairingEvents = useMemo(() => state.core?.pairing.events, [state])

  const sessionRequestListener = useCallback(
    (request: SignClientTypes.EventArguments['session_request']) => {
      // In theory, this should work if we moved this to handleSessionRequest.
      // In effect, after 2ish hours of debugging, couldn't manage to make it work there
      // Most likely related to `state.web3wallet` closure and a race condition where the reference of `web3wallet` in useWalletConnectEventsHandler()
      // is 1/2 renders stale, since this is a callback
      if (request.params.request.method === EIP155_SigningMethod.GET_CAPABILITIES) {
        state.web3wallet?.respondSessionRequest({
          topic: request.topic,
          response: formatJsonRpcResult(request.id, {}),
        })
      }

      isSupportedSessionRequest(request) && handleSessionRequest(request)
    },
    [handleSessionRequest, state.web3wallet],
  )

  const sessionDeleteListener = useCallback(
    ({ topic }: SignClientTypes.EventArguments['session_delete']) => {
      dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: { topic } })
    },
    [dispatch],
  )

  const sessionUpdateListener = useCallback(
    ({ topic, params }: SignClientTypes.EventArguments['session_update']) => {
      dispatch({ type: WalletConnectActionType.UPDATE_SESSION, payload: { ...params, topic } })
    },
    [dispatch],
  )

  const sessionPingListener = useCallback(() => {
    // We don't handle session pings... yet?
  }, [])

  const pairingPingListener = useCallback(() => {
    // We don't handle pairing pings... yet?
  }, [])

  const pairingDeleteListener = useCallback(
    ({ topic }: PairingEvent) => {
      dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: { topic } })
    },
    [dispatch],
  )

  const pairingExpireListener = useCallback(
    ({ topic }: PairingEvent) => {
      dispatch({ type: WalletConnectActionType.DELETE_SESSION, payload: { topic } })
    },
    [dispatch],
  )

  // Set up WalletConnect event listeners
  useEffect(() => {
    // signClient.events i.e wallet-related session events
    // note, those also exist as walletKit (web3wallet) events, but this guy is more reliable
    signClientEvents?.on('session_ping', sessionPingListener)
    signClientEvents?.on('session_proposal', handleSessionProposal)
    signClientEvents?.on('session_request', sessionRequestListener)
    signClientEvents?.on('session_update', sessionUpdateListener)
    signClientEvents?.on('session_delete', sessionDeleteListener)

    // auth-specific - not wallet-related just yet
    state.web3wallet?.on('session_authenticate', handleAuthRequest)

    // Pairing events
    pairingEvents?.on('pairing_ping', pairingPingListener)
    pairingEvents?.on('pairing_delete', pairingDeleteListener)
    pairingEvents?.on('pairing_expire', pairingExpireListener)

    return () => {
      signClientEvents?.off('session_ping', sessionPingListener)
      signClientEvents?.off('session_proposal', handleSessionProposal)
      signClientEvents?.off('session_request', sessionRequestListener)
      signClientEvents?.off('session_update', sessionUpdateListener)
      signClientEvents?.off('session_delete', sessionDeleteListener)

      state.web3wallet?.off('session_authenticate', handleAuthRequest)

      pairingEvents?.off('pairing_ping', pairingPingListener)
      pairingEvents?.off('pairing_delete', pairingDeleteListener)
      pairingEvents?.off('pairing_expire', pairingExpireListener)
    }
  }, [
    handleSessionProposal,
    handleSessionRequest,
    handleAuthRequest,
    state,
    signClientEvents,
    pairingEvents,
    dispatch,
    pairingDeleteListener,
    pairingExpireListener,
    sessionDeleteListener,
    sessionPingListener,
    sessionRequestListener,
    sessionUpdateListener,
    pairingPingListener,
  ])
}
