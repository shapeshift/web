import type EthereumProvider from '@walletconnect/ethereum-provider'
import type { Dispatch } from 'react'
import { useCallback, useEffect } from 'react'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import type { InitialState } from 'context/WalletProvider/WalletProvider'

export const useWalletConnectV2EventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
) => {
  const { provider } = state
  const ethereumProvider = provider as EthereumProvider

  const localWallet = useLocalWallet()

  const handleDisconnect = useCallback(() => {
    /**
     * in case of KeepKey placeholder wallet,
     * the disconnect function is undefined
     */
    state.wallet?.disconnect?.()
    dispatch({ type: WalletActions.RESET_STATE })
    localWallet.clearLocalWallet()
  }, [dispatch, localWallet, state.wallet])

  useEffect(() => {
    // This effect should run and attach event handlers on WalletConnectV2 only
    // Failure to check for the localWalletType will result in a bunch of random bugs on other wallets
    // being mistakenly identified as WalletConnectV2
    const localWalletType = localWallet.localWalletType
    if (localWalletType !== KeyManager.WalletConnectV2) return

    if (ethereumProvider) {
      ethereumProvider.on('disconnect', handleDisconnect)
      return () => {
        ethereumProvider.off?.('disconnect', handleDisconnect)
      }
    }
  }, [dispatch, ethereumProvider, handleDisconnect, localWallet.localWalletType, state.wallet])
}
