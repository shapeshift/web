import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { WalletKitTypes } from '@reown/walletkit'
import { useCallback } from 'react'

import type {
  SupportedSessionRequest,
  WalletConnectContextType,
  WalletConnectState,
} from '@/plugins/walletConnectToDapps/types'
import {
  CosmosSigningMethod,
  EIP155_SigningMethod,
  WalletConnectActionType,
  WalletConnectModal,
} from '@/plugins/walletConnectToDapps/types'

export const useWalletConnectEventsHandler = (
  dispatch: WalletConnectContextType['dispatch'],
  web3wallet: WalletConnectState['web3wallet'],
) => {
  // Open session proposal modal for confirmation / rejection
  const handleSessionProposal = useCallback(
    (proposal: WalletKitTypes.EventArguments['session_proposal']) => {
      dispatch({
        type: WalletConnectActionType.SET_MODAL,
        payload: { modal: WalletConnectModal.SessionProposal, data: { proposal } },
      })
    },
    [dispatch],
  )

  const handleAuthRequest = useCallback(
    (_request: WalletKitTypes.EventArguments['session_authenticate']) => {},
    [],
  )

  // Open request handling modal based on method that was used
  const handleSessionRequest = useCallback(
    async (requestEvent: SupportedSessionRequest) => {
      const { topic, params } = requestEvent
      const { request } = params
      const getRequestSession = () => {
        try {
          const allSessions = web3wallet?.engine.signClient.session.getAll()
          // We should be able to do web3wallet?.engine.signClient.session.get(topic) here, but this always return undefined, another day in closures-land
          const session = allSessions?.find(s => s.topic === topic)
          return session
        } catch (error) {
          console.error('Failed to get session for topic:', topic, error)
          return undefined
        }
      }

      switch (request.method) {
        case EIP155_SigningMethod.ETH_SIGN:
        case EIP155_SigningMethod.PERSONAL_SIGN:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SignEIP155MessageConfirmation,
              data: { requestEvent, requestSession: getRequestSession() },
            },
          })

        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SignEIP155TypedDataConfirmation,
              data: { requestEvent, requestSession: getRequestSession() },
            },
          })

        case EIP155_SigningMethod.ETH_SEND_TRANSACTION:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SendEIP155TransactionConfirmation,
              data: { requestEvent, requestSession: getRequestSession() },
            },
          })
        case EIP155_SigningMethod.ETH_SIGN_TRANSACTION:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SignEIP155TransactionConfirmation,
              data: { requestEvent, requestSession: getRequestSession() },
            },
          })

        case EIP155_SigningMethod.WALLET_ADD_ETHEREUM_CHAIN:
        case EIP155_SigningMethod.WALLET_SWITCH_ETHEREUM_CHAIN:
          // This doesn't fit our usual pattern and doesn't require a modal
          // We implicitly return a happy JSON-RPC response
          await web3wallet?.respondSessionRequest({
            topic,
            response: formatJsonRpcResult(requestEvent.id, null),
          })
          return
        case CosmosSigningMethod.COSMOS_SIGN_DIRECT:
        case CosmosSigningMethod.COSMOS_SIGN_AMINO:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SendCosmosTransactionConfirmation,
              data: { requestEvent, requestSession: getRequestSession() },
            },
          })

        default:
          return
      }
    },
    [dispatch, web3wallet],
  )

  return { handleSessionProposal, handleAuthRequest, handleSessionRequest }
}
