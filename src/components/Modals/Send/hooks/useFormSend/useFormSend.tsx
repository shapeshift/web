import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import type { SendInput } from '../../Form'
import { handleSend } from '../../utils'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const handleFormSend = useCallback(
    async (sendInput: SendInput, toastOnBroadcast: boolean): Promise<string | undefined> => {
      try {
        const asset = selectAssetById(store.getState(), sendInput.assetId)
        if (!asset) throw new Error(`No asset found for assetId ${sendInput.assetId}`)
        if (!wallet) throw new Error('No wallet connected')

        const broadcastTXID = await handleSend({ wallet, sendInput })

        setTimeout(() => {
          if (!toastOnBroadcast) return

          toast({
            title: translate('modals.send.sent', { asset: asset.name }),
            description: (
              <Text>
                <Text>
                  {translate('modals.send.youHaveSent', {
                    amount: sendInput.amountCryptoPrecision,
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

        return broadcastTXID
      } catch (e) {
        // If we're here, we know asset is defined
        const asset = selectAssetById(store.getState(), sendInput.assetId)!
        console.error(e)

        const translation =
          e instanceof ChainAdapterError
            ? translate(e.metadata.translation, e.metadata.options)
            : translate('modals.send.errors.transactionRejected')

        toast({
          title: translate('modals.send.errorTitle', {
            asset: asset.name,
          }),
          description: (
            <InlineCopyButton value={translation}>
              <RawText>{translation}</RawText>
            </InlineCopyButton>
          ),
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top-right',
        })

        return ''
      }
    },
    [toast, translate, wallet],
  )

  return {
    handleFormSend,
  }
}
