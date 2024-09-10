import { useCallback } from 'react'
import { SnapContent } from 'components/Modals/Snaps/SnapContent'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const SnapUpdate = () => {
  const { dispatch } = useWallet()

  const handleClose = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }, [dispatch])

  // If we land here, we know the version is incorrect
  const isCorrectVersion = false
  return <SnapContent onClose={handleClose} isCorrectVersion={isCorrectVersion} />
}
