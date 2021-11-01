import { PortisAdapter } from '@shapeshiftoss/hdwallet-portis'
import { useEffect } from 'react'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export const usePortisSuccess = () => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      try {
        // TODO handle else
        if (state.adapters?.portis) {
          const wallet = await (state.adapters.portis as PortisAdapter).pairDevice()
          const { name, icon } = SUPPORTED_WALLETS['portis']
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId: 'test' }
          })
          setIsSuccessful(true)
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        }
      } catch (error) {
        console.error('Failed to load device', error)
        setIsSuccessful(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  return { isSuccessful }
}
