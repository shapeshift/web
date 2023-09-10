import { useWeb3Modal } from '@web3modal/react'
import { useEffect } from 'react'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const Modal = () => {
  const { open, close } = useWeb3Modal()
  const { dispatch } = useWallet()

  useEffect(() => {
    open().then(() => {
      // Immediately close the wallet modal, as the WalletConnect modal will take it from here
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    })
  }, [dispatch, open])

  return <RawText>Loading WalletConnect modal...</RawText>
}
