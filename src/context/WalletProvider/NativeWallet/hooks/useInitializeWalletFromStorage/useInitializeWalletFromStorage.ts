import { useEffect } from 'react'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'

import { KeyManager } from '../../../config'

type StoredWallets = Record<string, string>

export const useInitializeWalletFromStorage = () => {
  const { state } = useWallet()
  const [localStorageWallet] = useLocalStorage<StoredWallets>('wallet', {})

  useEffect(() => {
    if (!(localStorageWallet && state.adapters?.has(KeyManager.Native))) return
    ;(async () => {
      const adapter = state.adapters?.get(KeyManager.Native)
      if (adapter) {
        for (const [deviceId] of Object.entries(localStorageWallet)) {
          try {
            const device = await adapter.pairDevice(deviceId)
            await device?.initialize()
          } catch (e) {
            console.error('Error pairing native wallet', deviceId)
          }
        }
      }
    })()
  }, [localStorageWallet, state.adapters])
}
