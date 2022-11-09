import { useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
const moduleLogger = logger.child({ namespace: ['useKeepKeyCancel'] })

export const useKeepKeyCancel = () => {
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
    disconnect,
    dispatch,
  } = useWallet()

  const cancelWalletRequest = useCallback(async () => {
    await wallet?.cancel().catch(e => {
      moduleLogger.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }, [toast, translate, wallet])

  const handleCancel = async () => {
    disconnect()
    await cancelWalletRequest()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }

  return handleCancel
}
