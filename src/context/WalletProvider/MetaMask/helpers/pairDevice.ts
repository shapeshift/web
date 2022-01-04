import detectEthereumProvider from "@metamask/detect-provider"

import { KeyManager, SUPPORTED_WALLETS } from "context/WalletProvider/config"
import { ActionTypes, Adapters, WalletActions } from "context/WalletProvider/WalletProvider"
import { History } from "history"
import { Dispatch } from "react"

interface IPairDeviceProps {
  // setError: (error: null | string) => void,
  // setLoading: (loading: boolean) => void,
  // setErrorLoading: (errorLoading: string | undefined) => void,
  adapters: Adapters | null,
  dispatch: Dispatch<ActionTypes>,
  history: History<unknown>,
}

export const pairDevice = async ({ 
  // setError,
  // setLoading,
  // setErrorLoading,
  adapters,
  dispatch,
  history,
}: IPairDeviceProps) => {
  // setError(null)
  // setLoading(true)

  let provider: any

  try {
    provider = await detectEthereumProvider()
  } catch (error) {
    throw new Error('walletProvider.metaMask.errors.connectFailure')
  }

  if (adapters && adapters?.has(KeyManager.MetaMask)) {
    const wallet = await adapters.get(KeyManager.MetaMask)?.pairDevice()
    if (!wallet) {
      // setErrorLoading('walletProvider.errors.walletNotFound')
      throw new Error('Call to hdwallet-metamask::pairDevice returned null or undefined')
    }

    const { name, icon } = SUPPORTED_WALLETS[KeyManager.MetaMask]
    try {
      const deviceId = await wallet.getDeviceID()

      if (provider !== window.ethereum) {
        throw new Error('walletProvider.metaMask.errors.multipleWallets')
      }

      if (provider?.chainId !== '0x1') {
        throw new Error('walletProvider.metaMask.errors.network')
      }

      // Hack to handle MetaMask account changes
      //TODO: handle this properly
      const resetState = () => dispatch({ type: WalletActions.RESET_STATE })
      provider?.on?.('accountsChanged', resetState)
      provider?.on?.('chainChanged', resetState)

      const oldDisconnect = wallet.disconnect.bind(wallet)
      wallet.disconnect = () => {
        provider?.removeListener?.('accountsChanged', resetState)
        provider?.removeListener?.('chainChanged', resetState)
        return oldDisconnect()
      }

      await wallet.initialize()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId }
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      console.info('/metamask/success')
      history.push('/metamask/success')
    } catch (e: any) {
      if (e?.message?.startsWith('walletProvider.')) {
        console.error('MetaMask Connect: There was an error initializing the wallet', e)
        // setErrorLoading(e?.message)
      } else {
        // setErrorLoading('walletProvider.metaMask.errors.unknown')
        history.push('/metamask/failure')
        console.info('/metamask/failure')
      }
    }
  }
  // setLoading(false)
}