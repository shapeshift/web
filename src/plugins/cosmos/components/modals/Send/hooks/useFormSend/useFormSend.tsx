import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import type { ChainAdapter, FeeData } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type { SendInput } from '../../Form'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const chainAdapterManager = getChainAdapterManager()
  const { send } = useModal()
  const {
    state: { wallet },
  } = useWallet()

  type CosmosSdkChainFees = FeeData<KnownChainIds.CosmosMainnet> &
    FeeData<KnownChainIds.OsmosisMainnet>

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        const adapter = chainAdapterManager.get(data.asset.chainId) as unknown as ChainAdapter<
          KnownChainIds.CosmosMainnet | KnownChainIds.OsmosisMainnet
        >
        if (!adapter) throw new Error(`No adapter available for chainId ${data.asset.chainId}`)
        const value = bnOrZero(data.cryptoAmount)
          .times(bn(10).exponentiatedBy(data.asset.precision))
          .toFixed(0)

        let result

        const { memo, estimatedFees, feeType, address: to } = data
        const fees = estimatedFees[feeType] as CosmosSdkChainFees
        const gas = fees.chainSpecific.gasLimit
        const fee = fees.txFee
        const address = to
        result = await adapter.buildSendTransaction({
          to: address,
          memo,
          value,
          wallet,
          chainSpecific: { gas, fee },
          sendMax: data.sendMax,
        })
        const txToSign = result?.txToSign

        let broadcastTXID: string | undefined

        // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask
        if (txToSign && wallet.supportsOfflineSigning()) {
          broadcastTXID = await adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
        } else {
          throw new Error('Bad hdwallet config')
        }

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
      } catch (error) {
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
  }
  return {
    handleSend,
  }
}
