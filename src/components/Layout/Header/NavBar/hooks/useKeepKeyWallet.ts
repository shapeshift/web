import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey/dist/keepkey'
import { useEffect, useState } from 'react'
import { KeyManager } from 'context/WalletProvider/config'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const useKeepKeyWallet = () => {
  const { state: walletState } = useWallet()
  const { type, wallet } = walletState
  const [keepKeyWallet, setKeepKeyWallet] = useState<KeepKeyHDWallet | undefined>()
  const isKeepKey = type === KeyManager.KeepKey

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      isKeepKey && setKeepKeyWallet(wallet as KeepKeyHDWallet)
    })()
  }, [isKeepKey, wallet])

  return keepKeyWallet
}
