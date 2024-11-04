import type { GetFeeDataInput, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'

type GetUtxoTxFeesInput = {
  sellAmountCryptoBaseUnit: string
  sellAdapter: UtxoChainAdapter
  publicKey: string
}

export const getUtxoTxFees = async ({
  sellAmountCryptoBaseUnit,
  sellAdapter,
  publicKey,
}: GetUtxoTxFeesInput): Promise<string> => {
  const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
    // One of many vault addresses - just used as a placeholder for the sake of loosely estimating fees - we *need* a *to* address for simulation or this will throw
    to: 'bc1pfh5x55a3v92klcrdy5yv6yrt7fzr0g929klkdtapp3njfyu4qsyq8qacyf',
    value: sellAmountCryptoBaseUnit,
    chainSpecific: { pubkey: publicKey },
  }

  const feeDataOptions = await sellAdapter.getFeeData(getFeeDataInput)

  const feeData = feeDataOptions['fast']

  return bn(feeData.txFee).dp(0).toString()
}
