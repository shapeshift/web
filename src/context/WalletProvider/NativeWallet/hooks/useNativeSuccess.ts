import * as native from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export type UseNativeSuccessPropTypes = { vault: Vault }

export const useNativeSuccess = ({ vault }: UseNativeSuccessPropTypes) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      const adapter = state.adapters?.get(KeyManager.Native)!
      try {
        await new Promise(resolve => setTimeout(resolve, 250))
        await vault.save()
        const deviceId = vault.id
        const wallet = (await adapter.pairDevice(deviceId)) as NativeHDWallet
        const mnemonic = (await vault.get(
          '#mnemonic'
        )) as native.crypto.Isolation.Core.BIP39.Mnemonic
        mnemonic.addRevoker?.(() => vault.revoke())
        await wallet.loadDevice({ mnemonic, deviceId })
        const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId }
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

        setIsSuccessful(true)
      } catch (error) {
        console.error('Failed to load device', error)
        setIsSuccessful(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault])

  return { isSuccessful }
}
