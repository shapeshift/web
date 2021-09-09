import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { useEffect } from 'react'

type StoredWallets = Record<string, string>

export const useInitializeWalletFromStorage = () => {
  const { state } = useWallet()
  const [localStorageWallet] = useLocalStorage<StoredWallets>('wallet', {})

  useEffect(() => {
    if (!(localStorageWallet && state.adapters?.native)) return
    ;(async () => {
      for (const [deviceId] of Object.entries(localStorageWallet)) {
        try {
          const device = await (state.adapters?.native as NativeAdapter).pairDevice(deviceId)
          await device?.initialize()
        } catch (e) {
          console.error('Error pairing native wallet', deviceId)
        }
      }
    })()
  }, [localStorageWallet, state.adapters])
}
