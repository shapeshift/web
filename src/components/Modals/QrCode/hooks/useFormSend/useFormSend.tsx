import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import type { QrCodeInput } from '../../Form'
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
    async (sendInput: QrCodeInput) => {
      try {
        const asset = selectAssetById(store.getState(), sendInput.assetId)
        if (!asset) throw new Error(`No asset found for assetId ${sendInput.assetId}`)
        if (!wallet) throw new Error('No wallet connected')

        const broadcastTXID = await handleSend({ wallet, sendInput })

        setTimeout(() => {
          toast({
            title: translate('modals.send.sent', { asset: asset.name }),
            description: (
              <Text>
                <Text>
                  {translate('modals.send.youHaveSent', {
                    amount: sendInput.cryptoAmount,
                    symbol: asset.symbol,
                  })}
                </Text>
                {asset.explorerTxLink && (
                  <Link href={`${asset.explorerTxLink}${broadcastTXID}`} isExternal>
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
        // If we're here, we know asset is defined
        const asset = selectAssetById(store.getState(), sendInput.assetId)!
        moduleLogger.error(e, 'Error handling form send')
        toast({
          title: translate('modals.send.errorTitle', {
            asset: asset.name,
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
