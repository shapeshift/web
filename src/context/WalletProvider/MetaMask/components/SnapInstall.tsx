import { useToast } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { SnapContent } from 'components/Modals/Snaps/SnapContent'
import { WalletActions } from 'context/WalletProvider/actions'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'

export const SnapInstall = () => {
  const { dispatch } = useWallet()
  const isSnapInstalled = useIsSnapInstalled()
  const toast = useToast()
  const translate = useTranslate()

  useEffect(() => {
    if (isSnapInstalled === true) {
      toast({
        status: 'success',
        title: translate('walletProvider.metaMaskSnap.snapInstalledToast'),
        position: 'bottom',
      })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    }
  }, [dispatch, isSnapInstalled, toast, translate])

  const handleClose = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }, [dispatch])

  return <SnapContent onClose={handleClose} />
}
