import type { SignClientTypes } from '@walletconnect/types'
import type { Web3WalletTypes } from '@walletconnect/web3wallet'
import type {
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import {
  CosmosSigningMethod,
  EIP155_SigningMethod,
  WalletConnectActionType,
  WalletConnectModal,
} from 'plugins/walletConnectToDapps/v2/types'
import { useCallback } from 'react'

export const useWalletConnectEventsHandler = (
  dispatch: WalletConnectContextType['dispatch'],
  web3wallet: WalletConnectState['web3wallet'],
) => {
  // Open session proposal modal for confirmation / rejection
  const handleSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      dispatch({
        type: WalletConnectActionType.SET_MODAL,
        payload: { modal: WalletConnectModal.sessionProposal, data: { proposal } },
      })
    },
    [dispatch],
  )

  const handleAuthRequest = useCallback((request: Web3WalletTypes.AuthRequest) => {
    console.log('[debug] auth_request', request)
  }, [])

  // Open request handling modal based on method that was used
  const handleSessionRequest = useCallback(
    (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      console.log('[debug] session_request', requestEvent)
      const { topic, params } = requestEvent
      const { request } = params
      // const requestSession = signClient.session.get(topic)
      const requestSession = web3wallet?.engine.signClient.session.get(topic)

      switch (request.method) {
        case EIP155_SigningMethod.ETH_SIGN:
        case EIP155_SigningMethod.PERSONAL_SIGN:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.signMessageConfirmation,
              data: { requestEvent, requestSession },
            },
          })

        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4:
          return dispatch({
            type: WalletConnectActionType.SET_MODAL,
            payload: {
              modal: WalletConnectModal.signMessageConfirmation,
              data: { requestEvent, requestSession },
            },
          })

        case EIP155_SigningMethod.ETH_SEND_TRANSACTION:
        case EIP155_SigningMethod.ETH_SIGN_TRANSACTION:
          return

        case CosmosSigningMethod.COSMOS_SIGN_DIRECT:
        case CosmosSigningMethod.COSMOS_SIGN_AMINO:
          return

        default:
          console.log('[debug] SessionUnsupportedMethodModal', { requestEvent, requestSession })
          return
      }
    },
    [dispatch, web3wallet?.engine.signClient.session],
  )

  return { handleSessionProposal, handleAuthRequest, handleSessionRequest }
}
