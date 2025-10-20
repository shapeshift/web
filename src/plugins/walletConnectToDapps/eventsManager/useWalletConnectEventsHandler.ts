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

      const session = getRequestSession()

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
          // Extract the ACTUAL requested chainId from the RPC params (not WC's chainId)
          // The RPC params contain chainId in hex format (e.g., "0x2105" for Base)
          const rpcParams = params.request.params as { chainId?: string }[]
          const hexChainId = rpcParams[0]?.chainId
          const actualChainIdDecimal = hexChainId ? parseInt(hexChainId, 16) : null
          const actualChainId = actualChainIdDecimal ? `eip155:${actualChainIdDecimal}` : null

          const approvedAccounts = session?.namespaces.eip155?.accounts ?? []

          // Check if the ACTUAL requested chain (from RPC params) is in approved accounts
          const actualChainInApprovedAccounts = actualChainId
            ? approvedAccounts.some(account => account.includes(`:${actualChainIdDecimal}:`))
            : false

          // If chain is not in approved accounts, show modal and return error 4902
          // This follows EIP-3326 spec and prevents dApp from thinking we have accounts for chains we don't
          if (!actualChainInApprovedAccounts) {
            // Show modal to inform user
            // We need to pass the ACTUAL chainId (from RPC params) not WC's chainId
            // So the modal shows the correct chain icon and name
            const modifiedRequestEvent = actualChainId
              ? {
                  ...requestEvent,
                  params: {
                    ...requestEvent.params,
                    chainId: actualChainId, // Override with actual chainId (e.g., eip155:8453 for Base)
                  },
                }
              : requestEvent
            dispatch({
              type: WalletConnectActionType.SET_MODAL,
              payload: {
                modal: WalletConnectModal.NoAccountsForChain,
                data: { requestEvent: modifiedRequestEvent, requestSession: getRequestSession() },
              },
            })

            // Send error to dApp
            // Error 4902 is a provider error (not server error), so we construct the JSON-RPC error manually
            await web3wallet?.respondSessionRequest({
              topic,
              response: {
                id: requestEvent.id,
                jsonrpc: '2.0',
                error: {
                  code: 4902,
                  message: `Unrecognized chain ID ${hexChainId}. Try adding the chain using wallet_addEthereumChain.`,
                },
              },
            })
            return
          }

          // Chain is approved, return success
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
