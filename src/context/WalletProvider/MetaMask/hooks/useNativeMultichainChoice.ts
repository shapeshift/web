import { btcChainId, solanaChainId } from '@shapeshiftoss/caip'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { getWallets } from '@wallet-standard/app'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAccountMigration } from '@/context/AppProvider/hooks/useAccountMigration'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { MetaMaskConfig } from '@/context/WalletProvider/MetaMask/config'
import { checkIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useNativeMultichainPreference } from '@/hooks/useNativeMultichainPreference'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isSome } from '@/lib/utils'
import { selectWalletId } from '@/state/slices/common-selectors'
import { selectAssetById } from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

// Detect which non-EVM chains MetaMask actually exposes via Wallet Standard.
// This runs at module scope since Wallet Standard registration happens early via content script.
const getAvailableChainIds = (): ChainId[] => {
  const wallets = getWallets().get()
  const mmWallets = wallets.filter(w => w.name === 'MetaMask')
  const chains: ChainId[] = []
  for (const w of mmWallets) {
    if (w.chains.some(c => c.startsWith('bitcoin:'))) chains.push(btcChainId)
    if (w.chains.some(c => c.startsWith('solana:'))) chains.push(solanaChainId)
  }
  return chains
}

type UseNativeMultichainChoiceArgs = {
  onDismiss: () => void
}

export const useNativeMultichainChoice = ({ onDismiss }: UseNativeMultichainChoiceArgs) => {
  const {
    dispatch,
    getAdapter,
    state: { deviceId },
  } = useWallet()
  const walletId = useAppSelector(selectWalletId)
  const { setPreference } = useNativeMultichainPreference(deviceId)
  const { migrateAccounts } = useAccountMigration()

  // Check snap status directly (useIsSnapInstalled returns null when flag is ON)
  const [hasSnap, setHasSnap] = useState<boolean | null>(null)
  useEffect(() => {
    checkIsSnapInstalled()
      .then(setHasSnap)
      .catch(() => setHasSnap(false))
  }, [])

  const chainAssets = useMemo<Asset[]>(() => {
    return getAvailableChainIds()
      .map(chainId => {
        const assetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
        if (!assetId) return undefined
        return selectAssetById(store.getState(), assetId)
      })
      .filter(isSome)
  }, [])

  const handleUseNative = useCallback(async () => {
    setPreference('native')
    if (walletId) {
      migrateAccounts(walletId)
    }
    onDismiss()
    // Silently re-pair to swap the wallet instance to the native multichain class.
    // getAdapter will now read the 'native' preference and create the native multichain wallet.
    try {
      const adapter = await getAdapter(KeyManager.MetaMask)
      if (!adapter) return
      const wallet = await adapter.pairDevice()
      if (!wallet) return
      await wallet.initialize()
      const newDeviceId = await wallet.getDeviceID()
      const { name, icon } = MetaMaskConfig
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId: newDeviceId, connectedType: KeyManager.MetaMask },
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
    } catch (e) {
      console.error('Failed to re-pair with native multichain class', e)
    }
  }, [setPreference, walletId, migrateAccounts, onDismiss, getAdapter, dispatch])

  const handleKeepSnap = useCallback(() => {
    setPreference('snap')
    onDismiss()
  }, [setPreference, onDismiss])

  return { hasSnap, chainAssets, handleUseNative, handleKeepSnap }
}
