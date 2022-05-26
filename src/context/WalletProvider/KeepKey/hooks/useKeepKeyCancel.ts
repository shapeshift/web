import { useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const useKeepKeyCancel = () => {
  const history = useHistory()
  const toast = useToast()
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
    history.replace('/')
    dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '' })
    await cancelWalletRequest()
  }

  return handleCancel
}
