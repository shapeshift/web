import type * as native from '@shapeshiftoss/hdwallet-native'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import {
  setLocalNativeWalletName,
  setLocalWalletTypeAndDeviceId,
} from 'context/WalletProvider/local-wallet'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { NativeConfig } from '../config'
const moduleLogger = logger.child({ namespace: ['useNativeSuccess'] })

export type UseNativeSuccessPropTypes = { vault: Vault }

export const useNativeSuccess = ({ vault }: UseNativeSuccessPropTypes) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      const adapter = state.adapters?.get(KeyManager.Native)!
      try {
        await new Promise(resolve => setTimeout(resolve, 250))
        await Promise.all([navigator.storage?.persist?.(), vault.save()])

        const deviceId = vault.id
        const wallet = (await adapter.pairDevice(deviceId)) as NativeHDWallet
        const mnemonic = (await vault.get(
          '#mnemonic',
        )) as native.crypto.Isolation.Core.BIP39.Mnemonic
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
          },
        })
        dispatch({ type: WalletActions.SET_IS_DEMO_WALLET, payload: false })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        setLocalWalletTypeAndDeviceId(KeyManager.Native, deviceId)
        setLocalNativeWalletName(walletLabel)
        setIsSuccessful(true)
      } catch (error) {
        moduleLogger.error(error, 'Failed to load device')
        setIsSuccessful(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault])

  return { isSuccessful }
}
