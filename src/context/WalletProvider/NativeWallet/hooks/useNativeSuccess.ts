import type { crypto, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { removeAccountsAndChainListeners } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { useWallet } from 'hooks/useWallet/useWallet'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from 'state/store'

import { NativeConfig } from '../config'

export type UseNativeSuccessPropTypes = { vault: Vault }

export const useNativeSuccess = ({ vault }: UseNativeSuccessPropTypes) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const appDispatch = useAppDispatch()
  const { setWelcomeModal } = preferences.actions
  const { state, getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()

  useEffect(() => {
    ;(async () => {
      const adapter = await getAdapter(KeyManager.Native)
      if (!adapter) throw new Error('Native adapter not found')
      try {
        // Remove all provider event listeners from previously connected wallets
        await removeAccountsAndChainListeners()

        await new Promise(resolve => setTimeout(resolve, 250))
        await Promise.all([navigator.storage?.persist?.(), vault.save()])

        const deviceId = vault.id
        const wallet = (await adapter.pairDevice?.(deviceId)) as NativeHDWallet
        const mnemonic = (await vault.get('#mnemonic')) as crypto.Isolation.Core.BIP39.Mnemonic
        mnemonic.addRevoker?.(() => vault.revoke())
        await wallet.loadDevice({ mnemonic, deviceId })
        const { name, icon } = NativeConfig
        const walletLabel = vault.meta.get('name') as string
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet,
            name,
            icon,
            deviceId,
            meta: { label: walletLabel },
            connectedType: KeyManager.Native,
          },
        })
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: { isConnected: true, modalType: state.modalType },
        })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        localWallet.setLocalWallet(KeyManager.Native, deviceId)
        localWallet.setLocalNativeWalletName(walletLabel)
        setIsSuccessful(true)
        //Set to show the native onboarding
        appDispatch(setWelcomeModal({ show: true }))
      } catch (error) {
        console.error(error)
        setIsSuccessful(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault])

  return { isSuccessful }
}
