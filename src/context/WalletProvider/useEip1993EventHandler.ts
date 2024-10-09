import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { PhantomAdapter } from '@shapeshiftoss/hdwallet-phantom'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { isMobile } from 'react-device-detect'
import { mipdStore } from 'lib/mipd'
import { selectWalletType } from 'state/slices/localWalletSlice/selectors'
import { store } from 'state/store'

import { WalletActions } from './actions'
import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import { useLocalWallet } from './local-wallet'
import type { IWalletContext } from './WalletContext'

export const useEip1993EventHandler = ({
  state,
  getAdapter,
  dispatch,
}: Pick<IWalletContext, 'state' | 'getAdapter' | 'dispatch'>) => {
  const { rdns: _rdns, localWalletType } = useLocalWallet()
  const mipdProviders = useSyncExternalStore(mipdStore.subscribe, mipdStore.getProviders)
  const rdns = useMemo(() => {
    // Uses rdns magic to detect provider for our first-class wallets
    if (localWalletType === KeyManager.Phantom) return 'app.phantom'
    if (localWalletType === KeyManager.Coinbase) return 'com.coinbase.wallet'
    return _rdns
  }, [_rdns, localWalletType])
  const maybeMipdProvider = mipdProviders.find(provider => provider.info.rdns === rdns)

  const currentRdnsRef = useRef(rdns)
  useEffect(() => {
    currentRdnsRef.current = rdns
  }, [rdns])

  const handleAccountsOrChainChanged = useCallback(
    async (accountsOrChains: string[] | string) => {
      if (!maybeMipdProvider || !state.adapters) return
      if (
        ![KeyManager.MetaMask, KeyManager.Phantom, KeyManager.Coinbase].includes(
          localWalletType as KeyManager,
        )
      )
        return
      // Never ever under any circumstances remove me. We attach event handlers to EIP-1993 providers,
      // and trying to detach them as we did previously is a guaranteed spaghetti code disaster and a recipe for bugs.
      // This ensures that we do *not* try to run this fn with stale event listeners from previously connected EIP-1993 wallets.
      if (maybeMipdProvider.info.rdns !== currentRdnsRef.current) return

      // Note, we NEED to use store.getState instead of the walletType variable above
      // The reason is handleAccountsOrChainChanged exists in the context of a closure, hence will keep a stale reference forever
      const _walletType = selectWalletType(store.getState())

      // This shouldn't happen if event listeners are properly removed, but they may not be
      // This fixes the case of switching from e.g MM, to another wallet, then switching accounts/chains in MM and MM becoming connected again
      if (_walletType && localWalletType !== _walletType) return
      if (!localWalletType) return

      const _isLocked = Array.isArray(accountsOrChains) && accountsOrChains.length === 0

      if (_isLocked) {
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: true })
      } else {
        // Either a chain change or a wallet unlock - ensure we set isLocked to false before continuing to avoid bad states
        dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
      }

      const adapter = (await getAdapter(localWalletType)) as MetaMaskAdapter | PhantomAdapter | null

      // Re-pair - which in case of accounts changed means the user will be prompted to connect their current account if they didn't do so
      // Note, this isn't guaranteed to work, not all wallets are the same, some (i.e MM) have this weird flow where connecting to an unconnected account
      // from a connected account can only be done from the wallet itself and not programmatically
      const localWallet = await adapter?.pairDevice()

      if (!localWallet) return

      await localWallet.initialize()
      const deviceId = await localWallet?.getDeviceID()

      if (!deviceId) return

      const { icon, name } = SUPPORTED_WALLETS[localWalletType]

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet: localWallet,
          name,
          icon,
          deviceId,
          connectedType: localWalletType,
        },
      })
    },
    [dispatch, getAdapter, localWalletType, maybeMipdProvider, state.adapters],
  )

  const setProviderEvents = useCallback(() => {
    // Always remove before setting
    maybeMipdProvider?.provider.removeListener?.('accountsChanged', handleAccountsOrChainChanged)
    maybeMipdProvider?.provider.removeListener?.('chainChanged', handleAccountsOrChainChanged)

    maybeMipdProvider?.provider.on?.('accountsChanged', (e: string[]) => {
      return handleAccountsOrChainChanged(e)
    })
    maybeMipdProvider?.provider.on?.('chainChanged', (e: string) => {
      return handleAccountsOrChainChanged(e)
    })
  }, [handleAccountsOrChainChanged, maybeMipdProvider?.provider])

  // Register a MetaMask-like (EIP-1193) provider's event handlers on mipd provider change
  useEffect(() => {
    const isMetaMaskMultichainWallet = state.wallet instanceof MetaMaskMultiChainHDWallet
    const isPhantomHdWallet = state.wallet instanceof PhantomHDWallet
    if (!(isMetaMaskMultichainWallet || isPhantomHdWallet)) return
    if (!maybeMipdProvider) return
    try {
      setProviderEvents()
    } catch (e) {
      if (!isMobile) console.error(e)
    }
  }, [maybeMipdProvider, setProviderEvents, state.wallet])
}
