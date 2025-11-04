import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { WalletKitTypes } from '@reown/walletkit'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, toChainId } from '@shapeshiftoss/caip'
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

  const handleSessionAuthRequest = useCallback(
    (request: WalletKitTypes.EventArguments['session_authenticate']) => {
      dispatch({
        type: WalletConnectActionType.SET_MODAL,
        payload: {
          modal: WalletConnectModal.SessionAuthenticateConfirmation,
          data: { request },
        },
      })
    },
    [dispatch],
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

          // Check if this is an authenticated session (has CACAO)
          if (session && 'auths' in session && session.auths?.length > 0) {
            console.log('[WalletConnect] Processing request for authenticated session:', {
              topic: session.topic,
              peer: session.peer.metadata.name,
              method: request.method,
              hasAuths: true,
              authsCount: session.auths.length,
              // Log the DID:PKH identifier from the CACAO
              issuer: session.auths[0]?.p?.iss,
            })
          }

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
        case EIP155_SigningMethod.WALLET_SWITCH_ETHEREUM_CHAIN: {
          const rpcParams = params.request.params as WalletSwitchEthereumChainParams
          const evmNetworkIdHex = rpcParams[0]?.chainId
          if (!evmNetworkIdHex) return

          const chainId = toChainId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: String(hexToNumber(evmNetworkIdHex)) as ChainReference,
          })
          const sessionAccountIds = session?.namespaces.eip155?.accounts ?? []
          const isChainInSession = sessionAccountIds.some(
            accountId => fromAccountId(accountId).chainId === chainId,
          )
          // There's an account for said chain in the session - all g, we can "switch" to it (as far as WC is concerned)
          if (isChainInSession)
            return web3wallet?.respondSessionRequest({
              topic,
              response: formatJsonRpcResult(requestEvent.id, null),
            })

          dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.NoAccountsForChain,
              data: { requestEvent, requestSession: getRequestSession() },
            },
          })

          // Return error 4902 (unrecognized chain) - de facto standard from MM and recognized by WC (or well, so it is by Relay)
          // See: https://docs.metamask.io/wallet/reference/wallet_switchethereumchain/
          await web3wallet?.respondSessionRequest({
            topic,
            response: {
              id: requestEvent.id,
              jsonrpc: '2.0',
              error: {
                code: 4902,
                message: `No accounts for chain: ${evmNetworkIdHex}.`,
              },
            },
          })
          return
        }
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

  return { handleSessionProposal, handleSessionAuthRequest, handleSessionRequest }
}
