import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import {
  type ChainAdapter,
  type EvmBaseAdapter,
  type EvmChainId,
  type FeeData,
  type UtxoBaseAdapter,
  type UtxoChainId,
  utxoChainIds,
} from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { tokenOrUndefined } from 'lib/utils'
import { selectPortfolioAccountMetadata } from 'state/slices/selectors'

import type { SendInput } from '../../Form'

const moduleLogger = logger.child({ namespace: ['Modals', 'Send', 'Hooks', 'UseFormSend'] })

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const chainAdapterManager = getChainAdapterManager()
  const { send } = useModal()
  const {
    state: { wallet },
  } = useWallet()
  const { supportedEvmChainIds } = useEvm()
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask
        if (
          fromChainId(data.asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk &&
          !wallet.supportsOfflineSigning()
        ) {
          throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
        }

        const adapter = chainAdapterManager.get(data.asset.chainId) as ChainAdapter<KnownChainIds>
        if (!adapter) throw new Error(`useFormSend: no adapter available for ${data.asset.chainId}`)

        if (!accountMetadata?.[data.accountId])
          throw new Error(`useFormSend: no accountMetadata for ${data.accountId}`)

        const value = bnOrZero(data.cryptoAmountBaseUnit)
          .times(bn(10).exponentiatedBy(data.asset.precision))
          .toFixed(0)

        const chainId = adapter.getChainId()

        const { estimatedFeesCryptoBaseUnit, feeType, address: to } = data

        const { bip44Params, accountType } = accountMetadata[data.accountId]
        if (!bip44Params) {
          throw new Error(`useFormSend: no bip44Params for accountId ${data.accountId}`)
        }

        const result = await (async () => {
          if (supportedEvmChainIds.includes(chainId)) {
            if (!supportsETH(wallet))
              throw new Error(`useFormSend: wallet does not support ethereum`)
            const fees = estimatedFeesCryptoBaseUnit[feeType] as FeeData<EvmChainId>
            const {
              chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
            } = fees
            const shouldUseEIP1559Fees =
              (await wallet.ethSupportsEIP1559()) &&
              maxFeePerGas !== undefined &&
              maxPriorityFeePerGas !== undefined
            if (!shouldUseEIP1559Fees && gasPrice === undefined) {
              throw new Error(`useFormSend: missing gasPrice for non-EIP-1559 tx`)
            }
            const erc20ContractAddress = tokenOrUndefined(
              fromAssetId(data.asset.assetId).assetReference,
            )
            return await (adapter as unknown as EvmBaseAdapter<EvmChainId>).buildSendTransaction({
              to,
              value,
              wallet,
              bip44Params,
              chainSpecific: {
                erc20ContractAddress,
                gasLimit,
                ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
              },
              sendMax: data.sendMax,
            })
          }

          if (utxoChainIds.some(utxoChainId => utxoChainId === chainId)) {
            const fees = estimatedFeesCryptoBaseUnit[feeType] as FeeData<UtxoChainId>

            if (!accountType) {
              throw new Error(
                `useFormSend: no accountType for utxo from accountId: ${data.accountId}`,
              )
            }
            return (adapter as unknown as UtxoBaseAdapter<UtxoChainId>).buildSendTransaction({
              to,
              value,
              wallet,
              bip44Params,
              chainSpecific: {
                satoshiPerByte: fees.chainSpecific.satoshiPerByte,
                accountType,
              },
              sendMax: data.sendMax,
            })
          }

          if (fromChainId(data.asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
            const fees = estimatedFeesCryptoBaseUnit[feeType] as FeeData<CosmosSdkChainId>
            return adapter.buildSendTransaction({
              to,
              memo: (data as SendInput<CosmosSdkChainId>).memo,
              value,
              wallet,
              bip44Params,
              chainSpecific: { gas: fees.chainSpecific.gasLimit, fee: fees.txFee },
              sendMax: data.sendMax,
            })
          }

          throw new Error(`${chainId} not supported`)
        })()

        const txToSign = result.txToSign

        const broadcastTXID = await (async () => {
          if (wallet.supportsOfflineSigning()) {
            const signedTx = await adapter.signTransaction({
              txToSign,
              wallet,
            })
            return adapter.broadcastTransaction(signedTx)
          } else if (wallet.supportsBroadcast()) {
            /**
             * signAndBroadcastTransaction is an optional method on the HDWallet interface.
             * Check and see if it exists; if so, call and make sure a txhash is returned
             */
            if (!adapter.signAndBroadcastTransaction) {
              throw new Error('signAndBroadcastTransaction undefined for wallet')
            }
            return adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
          } else {
            throw new Error('Bad hdwallet config')
          }
        })()

        if (!broadcastTXID) {
          throw new Error('Broadcast failed')
        }

        setTimeout(() => {
          toast({
            title: translate('modals.send.sent', { asset: data.asset.name }),
            description: (
              <Text>
                <Text>
                  {translate('modals.send.youHaveSent', {
                    amount: data.cryptoAmountBaseUnit,
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
        moduleLogger.error(error, { fn: 'handleSend' }, 'Error handling send')
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
        throw new Error('useFormSend: transaction rejected')
      } finally {
        send.close()
      }
    }
  }
  return {
    handleSend,
  }
}
