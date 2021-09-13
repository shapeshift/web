import { useToast } from '@chakra-ui/react'
import { ChainIdentifier } from '@shapeshiftoss/chain-adapters'
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
        const path = "m/44'/60'/0'/0/0" // TODO (technojak) get path and asset precision from asset-service
        const adapter = chainAdapter.byChain(ChainIdentifier.Ethereum)
        const value = bnOrZero(data.crypto.amount)
          .times(bnOrZero(10).exponentiatedBy(data.asset.precision || 18))
          .toFixed(0)

        const { txToSign } = await adapter.buildSendTransaction({
          to: data.address,
          value,
          erc20ContractAddress: data.asset.tokenId,
          wallet,
          path,
          fee: data.estimatedFees[data.feeType].feeUnitPrice,
          limit: data.estimatedFees[data.feeType].feeUnits
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
