import { useCallback } from 'react'
import { SnapContent } from 'components/Modals/Snaps/SnapContent'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const SnapInstall = () => {
  const { dispatch } = useWallet()

  const handleClose = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }, [dispatch])

  return (
    <SnapContent
      onClose={handleClose}
      // If we land here, we don't care about versioning, the user does *not* have the snap installed yet
      isCorrectVersion
      isSnapInstalled={false}
    />
  )
}
