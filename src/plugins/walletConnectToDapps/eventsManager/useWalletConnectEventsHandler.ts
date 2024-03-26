import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { Web3WalletTypes } from '@walletconnect/web3wallet'
import type {
  SupportedSessionRequest,
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/types'
import {
  CosmosSigningMethod,
  EIP155_SigningMethod,
  WalletConnectActionType,
  WalletConnectModal,
} from 'plugins/walletConnectToDapps/types'
import { useCallback } from 'react'

export const useWalletConnectEventsHandler = (
  dispatch: WalletConnectContextType['dispatch'],
  web3wallet: WalletConnectState['web3wallet'],
) => {
  // Open session proposal modal for confirmation / rejection
  const handleSessionProposal = useCallback(
    (proposal: Web3WalletTypes.EventArguments['session_proposal']) => {
      dispatch({
        type: WalletConnectActionType.SET_MODAL,
        payload: { modal: WalletConnectModal.SessionProposal, data: { proposal } },
      })
    },
    [dispatch],
  )

  const handleAuthRequest = useCallback((_request: Web3WalletTypes.AuthRequest) => {}, [])

  // Open request handling modal based on method that was used
  const handleSessionRequest = useCallback(
    async (requestEvent: SupportedSessionRequest) => {
      const { topic, params } = requestEvent
      const { request } = params
      const requestSession = web3wallet?.engine.signClient.session.get(topic)

      switch (request.method) {
        case EIP155_SigningMethod.ETH_SIGN:
        case EIP155_SigningMethod.PERSONAL_SIGN:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SignEIP155MessageConfirmation,
              data: { requestEvent, requestSession },
            },
          })

        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SignEIP155MessageConfirmation,
              data: { requestEvent, requestSession },
            },
          })

        case EIP155_SigningMethod.ETH_SEND_TRANSACTION:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SendEIP155TransactionConfirmation,
              data: { requestEvent, requestSession },
            },
          })
        case EIP155_SigningMethod.ETH_SIGN_TRANSACTION:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.SignEIP155TransactionConfirmation,
              data: { requestEvent, requestSession },
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
              data: { requestEvent, requestSession },
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
