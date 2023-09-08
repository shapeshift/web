import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import type { SendInput } from '../../Form'
import { handleSend } from '../../utils'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const send = useModal('send')
  const qrCode = useModal('qrCode')
  const {
    state: { wallet },
  } = useWallet()

  const handleFormSend = useCallback(
    async (sendInput: SendInput) => {
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
      } catch (e) {
        // If we're here, we know asset is defined
        const asset = selectAssetById(store.getState(), sendInput.assetId)!
        console.error(e)
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

        throw e
      } finally {
        // Sends may be done from the context of a QR code modal, or a send modal, which are similar, but effectively diff. modal refs
        qrCode.close()
        send.close()
      }
    },
    [qrCode, send, toast, translate, wallet],
  )

  return {
    handleFormSend,
  }
}
