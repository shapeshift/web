import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import type { SendInput } from '../../Form'
import { handleSend } from '../../utils'

const moduleLogger = logger.child({ namespace: ['Modals', 'Send', 'Hooks', 'UseFormSend'] })

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const { send } = useModal()
  const {
    state: { wallet },
  } = useWallet()

  const handleFormSend = useCallback(
    async (sendInput: SendInput) => {
      try {
        if (!wallet) throw new Error('No wallet connected')

        const broadcastTXID = await handleSend({ wallet, sendInput })

        setTimeout(() => {
          toast({
            title: translate('modals.send.sent', { asset: sendInput.asset.name }),
            description: (
              <Text>
                <Text>
                  {translate('modals.send.youHaveSent', {
                    amount: sendInput.cryptoAmount,
                    symbol: sendInput.cryptoSymbol,
                  })}
                </Text>
                {sendInput.asset.explorerTxLink && (
                  <Link href={`${sendInput.asset.explorerTxLink}${broadcastTXID}`} isExternal>
                    {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
                  </Link>
                )}
              </Text>
            ),
            status: 'success',
            duration: 9000,
            isClosable: true,
            position: 'top-right',
          })
        }, 5000)
      } catch (e: any) {
        moduleLogger.error(e, 'Error handling form send')
        toast({
          title: translate('modals.send.errorTitle', {
            asset: sendInput.asset.name,
          }),
          description: translate('modals.send.errors.transactionRejected'),
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top-right',
        })

        throw new Error(e)
      } finally {
        send.close()
      }
    },
    [send, toast, translate, wallet],
  )

  return {
    handleFormSend,
  }
}
