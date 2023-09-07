import { useToast } from '@chakra-ui/react'
import { useEffect } from 'react'
import { SnapContent } from 'components/Modals/Snaps/SnapContent'
import { WalletActions } from 'context/WalletProvider/actions'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'

export const SnapInstall = () => {
  const { dispatch } = useWallet()
  const isSnapInstalled = useIsSnapInstalled()
  const toast = useToast()

  useEffect(() => {
    if (isSnapInstalled === true) {
      toast({ status: 'success', title: 'Snap Installed', position: 'bottom' })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    }
  }, [dispatch, isSnapInstalled, toast])

  return <SnapContent />
}
