import { useToast } from '@chakra-ui/react'
import { ChainAdapter, utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useAllAccountTypes } from 'hooks/useAllAccountTypes/useAllAccountTypes'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getAccountTypeKey } from 'state/slices/preferencesSlice/preferencesSlice'

import { SendInput } from '../../Form'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const chainAdapterManager = useChainAdapters()
  const { send } = useModal()
  const {
    state: { wallet }
  } = useWallet()

  const allAccountTypes = useAllAccountTypes()

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        const adapter = chainAdapterManager.byChain(data.asset.chain)
        const value = bnOrZero(data.crypto.amount)
          .times(bnOrZero(10).exponentiatedBy(data.asset.precision))
          .toFixed(0)

        const adapterType = adapter.getType()

        let result

        const { estimatedFees, feeType } = data
        const accountType = allAccountTypes[getAccountTypeKey(data.asset.chain)]
        if (adapterType === ChainTypes.Ethereum) {
          const fees = estimatedFees[feeType] as chainAdapters.FeeData<ChainTypes.Ethereum>
          const fee = fees.feePerUnit
          const gasLimit = fees.chainSpecific?.feeLimit
          result = await (adapter as ChainAdapter<ChainTypes.Ethereum>).buildSendTransaction({
            to: data.address,
            value,
            wallet,
            chainSpecific: { erc20ContractAddress: data.asset.tokenId, fee, gasLimit }
          })
        } else if (adapterType === ChainTypes.Bitcoin) {
          const fees = estimatedFees[feeType] as chainAdapters.FeeData<ChainTypes.Bitcoin>

          const utxoParams = utxoAccountParams(data.asset, accountType, 0)

          result = await (adapter as ChainAdapter<ChainTypes.Bitcoin>).buildSendTransaction({
            to: data.address,
            value,
            wallet,
            bip32Params: utxoParams.bip32Params,
            chainSpecific: { satoshiPerByte: fees.feePerUnit, scriptType: utxoParams.scriptType }
          })
        } else {
          throw new Error('unsupported adapterType')
        }
        const txToSign = result.txToSign

        let broadcastTXID: string | undefined

        if (wallet.supportsOfflineSigning()) {
          const signedTx = await adapter.signTransaction({ txToSign, wallet })
          await adapter.broadcastTransaction(signedTx)
        } else if (wallet.supportsBroadcast()) {
          /**
           * signAndBroadcastTransaction is an optional method on the HDWallet interface.
           * Check and see if it exists; if so, call and make sure a txhash is returned
           */
          if (!adapter.signAndBroadcastTransaction) {
            throw new Error('signAndBroadcastTransaction undefined for wallet')
          }
          broadcastTXID = await adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
          if (!broadcastTXID) {
            throw new Error('Broadcast failed')
          }
        } else {
          throw new Error('Bad hdwallet config')
        }

        toast({
          title: translate('modals.send.sent', { asset: data.asset.name }),
          description: translate('modals.send.youHaveSent', {
            amount: data.crypto.amount,
            symbol: data.crypto.symbol
          }),
          status: 'success',
          duration: 9000,
          isClosable: true,
          position: 'top-right'
        })
      } catch (error) {
        toast({
          title: translate('modals.send.sent'),
          description: translate('modals.send.errorTitle'),
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top-right'
        })
      } finally {
        send.close()
      }
    }
  }
  return {
    handleSend
  }
}
