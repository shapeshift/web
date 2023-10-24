import { Events } from '@shapeshiftoss/hdwallet-core'
import type { Dispatch } from 'react'
import { useEffect } from 'react'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getLocalWalletType } from 'context/WalletProvider/local-wallet'
import type { DeviceState, InitialState } from 'context/WalletProvider/WalletProvider'

export const useLedgerEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
  loadWallet: () => void,
  setDeviceState: (deviceState: Partial<DeviceState>) => void,
) => {
  const { keyring, modal } = state

  useEffect(() => {
    // This effect should run and attach event handlers on Ledger only
    // Failure to check for the localWalletType will result in a bunch of random bugs on other wallets
    // being mistakenly identified as KeepKey
    const localWalletType = getLocalWalletType()
    if (localWalletType !== KeyManager.Ledger) return

    const handleConnect = async (_deviceId: string) => {
      // TODO(gomes): This does nothing currently, but we may want to handle connect here.
      // Note, dis/connect events are fired on app open/close and aren't really reliable nor reflecting the Ledger actually being dis/connected
      // The way we go around this is by opening and closing a connection just in time when doing a Ledger call, so we may never need to handle anything here
    }

    const handleDisconnect = (_deviceId: string) => {
      // TODO(gomes): This does nothing currently, but we may want to handle disconnect here.
      // Note, dis/connect events are fired on app open/close and aren't really reliable nor reflecting the Ledger actually being dis/connected
      // The way we go around this is by opening and closing a connection just in time when doing a Ledger call, so we may never need to handle anything here
    }

    // Handle all KeepKey events
    keyring.on(['*', '*', Events.CONNECT], handleConnect)
    keyring.on(['*', '*', Events.DISCONNECT], handleDisconnect)

    return () => {
      keyring.off(['*', '*', Events.CONNECT], handleConnect)
      keyring.off(['*', '*', Events.DISCONNECT], handleDisconnect)
    }
  }, [
    dispatch,
    keyring,
    loadWallet,
    modal,
    state.walletInfo,
    setDeviceState,
    state.connectedType,
    state.modalType,
  ])
}
