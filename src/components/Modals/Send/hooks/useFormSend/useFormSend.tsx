import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ChainAdaptersError } from '@shapeshiftoss/chain-adapters'
import type { ResponseError } from '@shapeshiftoss/unchained-client/src/generated/arbitrum'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
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

        if ((e as Error).name === 'ResponseError') {
          const error = await (e as ResponseError).response.json()
          const jsonError = JSON.parse(error.message)

          const chainAdapterManager = getChainAdapterManager()

          const feeAssetId = chainAdapterManager
            .get(fromAssetId(asset.assetId).chainId)
            ?.getFeeAssetId()

          const feeAsset = selectFeeAssetById(store.getState(), feeAssetId ?? '')

          // @TODO: as this is the first time we are handling errors from unchained in this scope, we dont have a complete error handling strategy
          // If we need to handle more errors, we should create a proper error handler
          if (jsonError.code === -32000) {
            toast({
              title: translate('modals.send.errorTitle', {
                asset: asset.name,
              }),
              description: translate('modals.send.errors.notEnoughNativeToken', {
                asset: feeAsset?.symbol,
              }),
              status: 'error',
              duration: 9000,
              isClosable: true,
              position: 'top-right',
            })
          }

          return
        }

        toast({
          title: translate('modals.send.errorTitle', {
            asset: asset.name,
          }),
          description:
            e instanceof ChainAdaptersError
              ? translate(e.metadata.translation, e.metadata.options)
              : translate('modals.send.errors.transactionRejected'),
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
