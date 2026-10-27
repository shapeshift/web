import { isStarknetInjected } from '@shapeshiftoss/hdwallet-core/wallet'
import type { StarknetInjectedHDWallet } from '@shapeshiftoss/hdwallet-starknet-injected'
import { useEffect, useRef } from 'react'

import { WalletActions } from './actions'
import { SUPPORTED_WALLETS } from './config'
import { isStarknetInjectedKeyManager } from './StarknetInjected/config'
import type { IWalletContext } from './WalletContext'

import { localWalletSlice } from '@/state/slices/localWalletSlice/localWalletSlice'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { store } from '@/state/store'

// Keeps a connected Ready/Braavos/Bramble wallet in sync with account switches made in the extension
export const useStarknetInjectedEventHandler = ({
  state,
  getAdapter,
  dispatch,
}: Pick<IWalletContext, 'state' | 'getAdapter' | 'dispatch'>) => {
  const { wallet, connectedType, deviceId } = state

  // Refs so listeners are only re-attached when the wallet itself changes
  const getAdapterRef = useRef(getAdapter)
  const deviceIdRef = useRef(deviceId)

  useEffect(() => {
    getAdapterRef.current = getAdapter
    deviceIdRef.current = deviceId
  }, [getAdapter, deviceId])

  useEffect(() => {
    if (!wallet || !isStarknetInjected(wallet)) return
    if (!isStarknetInjectedKeyManager(connectedType)) return

    const keyManager = connectedType
    const starknetWallet = wallet as StarknetInjectedHDWallet
    let latestRefreshId = 0

    const refreshWallet = async () => {
      const refreshId = ++latestRefreshId
      // Account and network events often fire together - only the latest refresh may apply
      const isStale = () =>
        refreshId !== latestRefreshId || selectWalletType(store.getState()) !== keyManager

      if (isStale()) return

      try {
        // Balances and txs are mainnet only - the wrong network button handles the rest
        if (!(await starknetWallet.isMainnet())) return

        const adapter = await getAdapterRef.current(keyManager)
        // Silent - must never pop up a prompt the user didn't ask for
        const nextWallet = await adapter?.pairDevice(true)
        if (isStale()) return

        if (!nextWallet) {
          dispatch({ type: WalletActions.SET_IS_LOCKED, payload: true })
          return
        }

        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })

        const nextDeviceId = await nextWallet.getDeviceID()
        if (isStale() || nextDeviceId === deviceIdRef.current) return

        deviceIdRef.current = nextDeviceId
        const { name, icon } = SUPPORTED_WALLETS[keyManager]

        // A new deviceId is a new walletId, which triggers account discovery for the new account
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet: nextWallet,
            name,
            icon,
            deviceId: nextDeviceId,
            connectedType: keyManager,
          },
        })
        store.dispatch(
          localWalletSlice.actions.setLocalWallet({
            type: keyManager,
            deviceId: nextDeviceId,
            rdns: null,
          }),
        )
      } catch (e) {
        console.error(e, `${keyManager}: failed to refresh wallet after an account/network change`)
      }
    }

    const handleAccountsChanged = (accounts?: unknown) => {
      // No accounts means the extension was locked or this site was disconnected from it
      if (!Array.isArray(accounts) || !accounts.length) {
        latestRefreshId++
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: true })
        return
      }

      void refreshWallet()
    }

    // Switching back to mainnet can land on a different account
    const handleNetworkChanged = () => void refreshWallet()

    starknetWallet.provider.on('accountsChanged', handleAccountsChanged)
    starknetWallet.provider.on('networkChanged', handleNetworkChanged)

    return () => {
      latestRefreshId++
      starknetWallet.provider.off('accountsChanged', handleAccountsChanged)
      starknetWallet.provider.off('networkChanged', handleNetworkChanged)
    }
  }, [connectedType, dispatch, wallet])
}
