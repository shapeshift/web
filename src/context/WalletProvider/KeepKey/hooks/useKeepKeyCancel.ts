import { useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { clearLocalWallet } from 'context/WalletProvider/local-wallet'
const moduleLogger = logger.child({ namespace: ['useKeepKeyCancel'] })

export const useKeepKeyCancel = () => {
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
    disconnect,
    dispatch,
    setIsUpdatingKeepkey,
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
    dispatch({ type: WalletActions.RESET_STATE })
    setIsUpdatingKeepkey(false)
    // clearLocalWallet()
    await cancelWalletRequest()
  }

  return handleCancel
}
