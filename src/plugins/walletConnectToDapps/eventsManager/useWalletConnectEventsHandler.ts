import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { WalletKitTypes } from '@reown/walletkit'
import { useCallback } from 'react'
import { hexToNumber } from 'viem'

import type {
  SupportedSessionRequest,
  WalletConnectContextType,
  WalletConnectState,
  WalletSwitchEthereumChainParams,
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

  const handleSessionRequest = useCallback(
    async (requestEvent: SupportedSessionRequest) => {
      const { topic, params } = requestEvent
      const { request } = params
      const getRequestSession = () => {
        try {
          const allSessions = web3wallet?.engine.signClient.session.getAll()
          // Can't use session.get(topic) directly due to closure issues - it returns undefined
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
          // WalletConnect's params.chainId shows the chain namespace the request came through (e.g., "eip155:100")
          // But request.params[0].chainId contains the actual chain the dApp wants to switch to (e.g., "0x2105")
          const rpcParams = params.request.params as WalletSwitchEthereumChainParams
          const hexChainId = rpcParams[0]?.chainId
          const chainIdNumber = hexChainId ? hexToNumber(hexChainId) : null
          const chainId = chainIdNumber ? `eip155:${chainIdNumber}` : null

          const approvedAccounts = session?.namespaces.eip155?.accounts ?? []
          const isChainApproved = chainId
            ? approvedAccounts.some(account => account.includes(`:${chainIdNumber}:`))
            : false

          if (!isChainApproved) {
            // Override chainId in requestEvent so modal displays the correct chain icon
            const modifiedRequestEvent = chainId
              ? {
                  ...requestEvent,
                  params: {
                    ...requestEvent.params,
                    chainId,
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

            // Return error 4902 per EIP-3326 spec
            // https://eips.ethereum.org/EIPS/eip-3326
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
