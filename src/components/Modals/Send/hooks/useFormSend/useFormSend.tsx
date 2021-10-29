import { useToast } from '@chakra-ui/react'
import { bip32AndScript } from '@shapeshiftoss/chain-adapters'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'
import { getScriptTypeKey, scriptTypePrefix } from 'state/slices/preferencesSlice/preferencesSlice'

import { SendInput } from '../../Form'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const chainAdapter = useChainAdapters()
  const { send } = useModal()
  const {
    state: { wallet }
  } = useWallet()

  const allScriptTypes: { [key: string]: BTCInputScriptType } = useSelector((state: ReduxState) =>
    Object.entries(state.preferences).reduce(
      (acc, val) =>
        val[0].startsWith(scriptTypePrefix) ? { ...acc, [val[0]]: val[1] } : { ...acc },
      {}
    )
  )

  const handleSend = async (data: SendInput) => {
    if (wallet) {
      try {
        const adapter = chainAdapter.byChain(data.asset.chain)
        const value = bnOrZero(data.crypto.amount)
          .times(bnOrZero(10).exponentiatedBy(data.asset.precision))
          .toFixed(0)

        const { estimatedFees, feeType } = data
        const fees = estimatedFees[feeType]
        const fee = fees.feePerUnit
        const gasLimit = fees.chainSpecific?.feeLimit

        const scriptType = allScriptTypes[getScriptTypeKey(data.asset.chain)]

        const { txToSign } = await adapter.buildSendTransaction({
          to: data.address,
          value,
          erc20ContractAddress: data.asset.tokenId,
          wallet,
          fee,
          gasLimit,
          ...bip32AndScript(scriptType, data.asset)
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
