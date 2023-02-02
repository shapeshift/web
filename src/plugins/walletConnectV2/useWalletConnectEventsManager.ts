import type { SignClientTypes } from '@walletconnect/types'
import type { IWeb3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet'
import { CosmosSigningMethod, EIP155_SigningMethod } from 'plugins/walletConnectV2/types'
import { useCallback, useEffect } from 'react'

export const useWalletConnectEventsManager = (
  initialized: boolean,
  web3wallet: IWeb3Wallet | undefined,
) => {
  /******************************************************************************
   * 1. Open session proposal modal for confirmation / rejection
   *****************************************************************************/
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      // Get required proposal data
      const { id, params } = proposal
      const { proposer, requiredNamespaces, relays } = params
      console.log('[debug] session_proposal', proposal)
    },
    [],
  )

  const onAuthRequest = useCallback((request: Web3WalletTypes.AuthRequest) => {
    console.log('[debug] auth_request', request)
  }, [])

  /******************************************************************************
   * 3. Open request handling modal based on method that was used
   *****************************************************************************/
  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      console.log('[debug] session_request', requestEvent)
      const { topic, params } = requestEvent
      const { request } = params
      // const requestSession = signClient.session.get(topic)
      const requestSession = web3wallet?.engine.signClient.session.get(topic)

      switch (request.method) {
        case EIP155_SigningMethod.ETH_SIGN:
        case EIP155_SigningMethod.PERSONAL_SIGN:
          console.log('[debug] SessionSignPersonalModal', { requestEvent, requestSession })
          return undefined

        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4:
          console.log('[debug] SessionSignTypedDataModal', { requestEvent, requestSession })
          return

        case EIP155_SigningMethod.ETH_SEND_TRANSACTION:
        case EIP155_SigningMethod.ETH_SIGN_TRANSACTION:
          console.log('[debug] SessionSendTransactionModal', { requestEvent, requestSession })
          return

        case CosmosSigningMethod.COSMOS_SIGN_DIRECT:
        case CosmosSigningMethod.COSMOS_SIGN_AMINO:
          console.log('[debug] SessionSignCosmosModal', { requestEvent, requestSession })
          return

        default:
          console.log('[debug] SessionUnsuportedMethodModal', { requestEvent, requestSession })
          return
      }
    },
    [web3wallet?.engine.signClient.session],
  )

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
      // sign
      web3wallet?.on('session_proposal', onSessionProposal)
      web3wallet?.on('session_request', onSessionRequest)
      // auth
      web3wallet?.on('auth_request', onAuthRequest)

      // TODOs
      // signClient.on('session_ping', data => console.log('ping', data))
      // signClient.on('session_event', data => console.log('event', data))
      // signClient.on('session_update', data => console.log('update', data))
      // signClient.on('session_delete', data => console.log('delete', data))
    }
  }, [initialized, onSessionProposal, onSessionRequest, onAuthRequest, web3wallet])
}
