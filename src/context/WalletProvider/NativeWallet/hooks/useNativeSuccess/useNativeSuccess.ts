import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export type UseNativeSuccessPropTypes = { vault?: Vault }

export const useNativeSuccess = ({ vault }: UseNativeSuccessPropTypes) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (vault && state.adapters && state.adapters.has(KeyManager.Native)) {
        try {
          const adapter = state.adapters.get(KeyManager.Native)
          if (!adapter) throw new Error('Native Adapter is not available')

          const deviceId = vault.id
          const wallet = await adapter.pairDevice(deviceId)
          await wallet?.loadDevice({ mnemonic: await vault.get('#mnemonic') })
          const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId }
          })
          setIsSuccessful(true)
        } catch (error) {
          console.error('Failed to load device', error)
          setIsSuccessful(false)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault])

  return { isSuccessful }
}
