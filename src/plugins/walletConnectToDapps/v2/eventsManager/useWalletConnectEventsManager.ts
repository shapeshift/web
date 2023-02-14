import { useWalletConnectEventsHandler } from 'plugins/walletConnectToDapps/v2/eventsManager/useWalletConnectEventsHandler'
import type {
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { useEffect } from 'react'

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

      // Sign
      web3wallet.on('session_proposal', handleSessionProposal)
      web3wallet.on('session_request', handleSessionRequest)

      // Auth
      web3wallet.on('auth_request', handleAuthRequest)

      // Pairing
      pairingEvents.on('pairing_ping', (data: any) => console.log('[debug] pairing_ping', data))
      pairingEvents.on('pairing_delete', (data: any) => console.log('[debug] pairing_delete', data))
      pairingEvents.on('pairing_expire', (data: any) => console.log('[debug] pairing_expire', data))

      // Session
      signClientEvents.on('session_ping', data => console.log('[debug] ping', data))
      signClientEvents.on('session_update', data => console.log('[debug] update', data))
      signClientEvents.on('session_delete', data => console.log('[debug] delete', data))

      return () => {
        // Sign
        web3wallet.off('session_proposal', handleSessionProposal)
        web3wallet.off('session_request', handleSessionRequest)

        // Auth
        web3wallet.off('auth_request', handleAuthRequest)

        pairingEvents.off('pairing_ping', (data: any) => console.log('[debug] pairing_ping', data))
        pairingEvents.off('pairing_delete', (data: any) =>
          console.log('[debug] pairing_delete', data),
        )
        pairingEvents.off('pairing_expire', (data: any) =>
          console.log('[debug] pairing_expire', data),
        )

        // Session
        signClientEvents.off('session_ping', data => console.log('[debug] ping', data))
        signClientEvents.off('session_update', data => console.log('[debug] update', data))
        signClientEvents.off('session_delete', data => console.log('[debug] delete', data))
      }
    }
  }, [
    handleSessionProposal,
    handleSessionRequest,
    handleAuthRequest,
    web3wallet,
    isInitialized,
    core,
  ])
}
