import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const useKeepKeyCancel = () => {
  const navigate = useNavigate()
  const toast = useNotificationToast()
  const translate = useTranslate()
  const {
    state: { wallet },
    dispatch,
  } = useWallet()

  const cancelWalletRequest = useCallback(async () => {
    await wallet?.cancel().catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }, [toast, translate, wallet])

  const handleCancel = async () => {
    navigate('/', { replace: true })
    dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    await cancelWalletRequest()
  }

  return handleCancel
}
