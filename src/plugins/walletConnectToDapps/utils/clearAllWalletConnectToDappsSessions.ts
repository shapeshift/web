import { getSdkError } from '@walletconnect/utils'
import { getWalletConnectWallet } from 'plugins/walletConnectToDapps/walletUtils'

export const clearWalletConnectLocalStorage = () => {
  const keysToRemove: string[] = []

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i) as string
    if (key.startsWith('wc@2')) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key)
  }
}

export const clearAllWalletConnectToDappsSessions = async () => {
  // fire disconnection events for all active sessions so other apps can disconnect
  const web3wallet = await getWalletConnectWallet()
  for (const session of Object.values(web3wallet.getActiveSessions())) {
    void web3wallet.disconnectSession({
      topic: session.topic,
      reason: getSdkError('USER_DISCONNECTED'),
    })
  }

  // catch-all, clear local storage
  clearWalletConnectLocalStorage()
}
