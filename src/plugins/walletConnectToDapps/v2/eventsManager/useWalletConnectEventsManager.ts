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
      const signClient = web3wallet.engine.signClient

      // Sign
      web3wallet.on('session_proposal', handleSessionProposal)
      web3wallet.on('session_request', handleSessionRequest)

      // Auth
      web3wallet.on('auth_request', handleAuthRequest)

      // Pairing
      core.pairing.events.on('pairing_ping', (data: any) =>
        console.log('[debug] pairing_ping', data),
      )
      core.pairing.events.on('pairing_delete', (data: any) =>
        console.log('[debug] pairing_delete', data),
      )
      core.pairing.events.on('pairing_expire', (data: any) =>
        console.log('[debug] pairing_expire', data),
      )

      // Session
      signClient.events.on('session_ping', data => console.log('[debug] ping', data))
      signClient.events.on('session_update', data => console.log('[debug] update', data))
      signClient.events.on('session_delete', data => console.log('[debug] delete', data))

      return () => {
        console.log('[debug] useWalletConnectEventsManager unregistering ons', { web3wallet })
        // Sign
        web3wallet.off('session_proposal', handleSessionProposal)
        web3wallet.off('session_request', handleSessionRequest)

        // Auth
        web3wallet.off('auth_request', handleAuthRequest)

        core.pairing.events.off('pairing_ping', (data: any) =>
          console.log('[debug] pairing_ping', data),
        )
        core.pairing.events.off('pairing_delete', (data: any) =>
          console.log('[debug] pairing_delete', data),
        )
        core.pairing.events.off('pairing_expire', (data: any) =>
          console.log('[debug] pairing_expire', data),
        )

        // Session
        signClient.events.off('session_ping', data => console.log('[debug] ping', data))
        signClient.events.off('session_update', data => console.log('[debug] update', data))
        signClient.events.off('session_delete', data => console.log('[debug] delete', data))
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
