import type EthereumProvider from '@walletconnect/ethereum-provider'
import type { Dispatch } from 'react'
import { useCallback, useEffect } from 'react'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { clearLocalWallet } from 'context/WalletProvider/local-wallet'
import type { InitialState } from 'context/WalletProvider/WalletProvider'

export const useWalletConnectV2EventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
) => {
  const { provider } = state
  const ethereumProvider = provider as EthereumProvider

  const handleDisconnect = useCallback(() => {
    /**
     * in case of KeepKey placeholder wallet,
     * the disconnect function is undefined
     */
    state.wallet?.disconnect?.()
    dispatch({ type: WalletActions.RESET_STATE })
    clearLocalWallet()
  }, [dispatch, state.wallet])

  useEffect(() => {
    if (ethereumProvider) {
      ethereumProvider.on('disconnect', () => handleDisconnect)
    }
    return () => {
      ethereumProvider.off('disconnect', handleDisconnect)
    }
  }, [dispatch, ethereumProvider, handleDisconnect, state.wallet])
}
