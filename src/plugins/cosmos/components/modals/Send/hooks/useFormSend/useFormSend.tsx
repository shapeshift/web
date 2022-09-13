import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'

import type { SendInput } from '../../Form'

const moduleLogger = logger.child({ namespace: ['cosmos', 'useFormSend'] })

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const chainAdapterManager = getChainAdapterManager()
  const { send } = useModal()
  const {
    state: { wallet },
  } = useWallet()

  const handleSend = async (data: SendInput) => {
    if (!wallet) return

    try {
      // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask
      if (!wallet.supportsOfflineSigning()) {
        throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
      }

      const adapter = chainAdapterManager.get(
        data.asset.chainId,
      ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>

      if (!adapter) throw new Error(`No adapter available for chainId ${data.asset.chainId}`)

      const value = bnOrZero(data.cryptoAmount)
        .times(bn(10).exponentiatedBy(data.asset.precision))
        .toFixed(0)

      const { memo, estimatedFees, feeType, address } = data
      const fees = estimatedFees[feeType]

      const { txToSign } = await adapter.buildSendTransaction({
        to: address,
        memo,
        value,
        wallet,
        chainSpecific: { gas: fees.chainSpecific.gasLimit, fee: fees.txFee },
        sendMax: data.sendMax,
      })

      const broadcastTXID = await adapter.signAndBroadcastTransaction({ txToSign, wallet })

      setTimeout(() => {
        toast({
          title: translate('modals.send.sent', { asset: data.asset.name }),
          description: (
            <Text>
              <Text>
                {translate('modals.send.youHaveSent', {
                  amount: data.cryptoAmount,
                  symbol: data.cryptoSymbol,
                })}
              </Text>
              {data.asset.explorerTxLink && (
                <Link href={`${data.asset.explorerTxLink}${broadcastTXID}`} isExternal>
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
    } catch (err) {
      moduleLogger.error(err, 'handleSend:')

      toast({
        title: translate('modals.send.errorTitle', {
          asset: data.asset.name,
        }),
        description: translate('modals.send.errors.transactionRejected'),
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    } finally {
      send.close()
    }
  }

  return {
    handleSend,
  }
}
