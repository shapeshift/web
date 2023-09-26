import { useToast } from '@chakra-ui/react'
import { Events } from '@shapeshiftoss/hdwallet-core'
import type { Dispatch } from 'react'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getLocalWalletType } from 'context/WalletProvider/local-wallet'
import type { DeviceState, InitialState } from 'context/WalletProvider/WalletProvider'
import { usePoll } from 'hooks/usePoll/usePoll'

export const useLedgerEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
  loadWallet: () => void,
  setDeviceState: (deviceState: Partial<DeviceState>) => void,
) => {
  const {
    keyring,
    modal,
    deviceState: { disposition, isUpdatingPin },
  } = state

  const toast = useToast()
  const translate = useTranslate()
  const { poll } = usePoll()

  useEffect(() => {
    // This effect should run and attach event handlers on Ledger only
    // Failure to check for the localWalletType will result in a bunch of random bugs on other wallets
    // being mistakenly identified as KeepKey
    const localWalletType = getLocalWalletType()
    if (localWalletType !== KeyManager.Ledger) return

    const handleConnect = async (deviceId: string) => {
      // try {
      // const id = keyring.getAlias(deviceId)
      // const wallet = keyring.get(id)
      // if (wallet && id === state.walletInfo?.deviceId) {
      // This gets the firmware version needed for some Ledger "supportsX" functions
      // await wallet.getFeatures()
      // Show the label from the wallet instead of a generic name
      // const name = (await wallet.getLabel()) || state.walletInfo.name
      // The keyring might have a new HDWallet instance for the device.
      // We'll replace the one we have in state with the new one
      // dispatch({
      // type: WalletActions.SET_WALLET,
      // payload: {
      // wallet,
      // name,
      // deviceId: id,
      // meta: { label: name },
      // connectedType: KeyManager.Ledger,
      // icon: state.walletInfo.icon, // We're reconnecting the same wallet so we can reuse the walletInfo
      // },
      // })
      // dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      // }
      // } catch (e) {
      // console.error(e)
      // }
    }

    const handleDisconnect = (deviceId: string) => {
      console.log('disconnect')
      try {
        // const id = keyring.getAlias(deviceId)
        // if (id === state.walletInfo?.deviceId) {
        // dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
        // }
        // if (modal) {
        // Little trick to send the user back to the wallet select route
        // dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        // dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        // }
      } catch (e) {
        console.error(e)
      }
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
    isUpdatingPin,
    modal,
    state.walletInfo,
    setDeviceState,
    disposition,
    toast,
    translate,
    poll,
    state.connectedType,
    state.modalType,
  ])
}
