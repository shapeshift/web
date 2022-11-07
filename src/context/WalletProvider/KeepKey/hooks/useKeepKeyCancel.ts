import { useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
const moduleLogger = logger.child({ namespace: ['useKeepKeyCancel'] })

export const useKeepKeyCancel = () => {
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
    disconnect,
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
  }

  return handleCancel
}
