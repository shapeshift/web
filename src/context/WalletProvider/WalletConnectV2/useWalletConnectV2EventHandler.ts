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
  const { wcV2Provider } = state

  const localWallet = useLocalWallet()

  const handleDisconnect = useCallback(() => {
    /**
     * in case of KeepKey placeholder wallet,
     * the disconnect function is undefined
     */
    state.wallet?.disconnect?.()
    dispatch({ type: WalletActions.RESET_STATE })
  }, [dispatch, state.wallet])

  useEffect(() => {
    // This effect should never run for wallets other than WalletConnectV2 since we explicitly tap into @walletconnect/ethereum-provider provider
    // but...
    const localWalletType = localWallet.localWalletType
    if (localWalletType !== KeyManager.WalletConnectV2) return

    if (wcV2Provider) {
      wcV2Provider.on('disconnect', handleDisconnect)
      return () => {
        wcV2Provider.off?.('disconnect', handleDisconnect)
      }
    }
  }, [dispatch, handleDisconnect, localWallet.localWalletType, state.wallet, wcV2Provider])
}
