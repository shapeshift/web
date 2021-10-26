import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { useEffect } from 'react'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export const useMetaSuccess = () => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      try {
        const wallet = await (state.adapters.metamask as MetaMaskAdapter).pairDevice()
        const { name, icon } = SUPPORTED_WALLETS['metamask']
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId: 'test' }
        })
        setIsSuccessful(true)
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      } catch (error) {
        console.error('Failed to load device', error)
        setIsSuccessful(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  return { isSuccessful }
}
