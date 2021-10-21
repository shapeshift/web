import { useToast } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { SendInput } from '../../Form'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const chainAdapter = useChainAdapters()
  const { send } = useModal()
  const {
    state: { wallet }
  } = useWallet()

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        const adapter = chainAdapter.byChain(data.asset.chain)
        const value = bnOrZero(data.crypto.amount)
          .times(bnOrZero(10).exponentiatedBy(data.asset.precision))
          .toFixed(0)

        const { estimatedFees, feeType } = data
        const fees = estimatedFees[feeType]
        const fee = fees.chainSpecific?.feePerUnit
        const gasLimit = fees.chainSpecific?.feeLimit

        const { txToSign } = await adapter.buildSendTransaction({
          to: data.address,
          value,
          erc20ContractAddress: data.asset.tokenId,
          wallet,
          fee,
          gasLimit
        })

        const signedTx = await adapter.signTransaction({ txToSign, wallet })

        await adapter.broadcastTransaction(signedTx)

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
          description: translate('modals.send.somethingWentWrong'),
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
