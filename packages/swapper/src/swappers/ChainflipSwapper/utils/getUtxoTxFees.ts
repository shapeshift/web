import type { GetFeeDataInput, UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'

import type { QuoteFeeData } from '../../../types'

type GetUtxoTxFeesInput = {
  sellAmountCryptoBaseUnit: string
  sellAdapter: UtxoChainAdapter
  pubKey: string | undefined
}

export const getUtxoTxFees = async ({
  sellAmountCryptoBaseUnit,
  sellAdapter,
  pubKey,
}: GetUtxoTxFeesInput): Promise<Omit<QuoteFeeData, 'protocolFees'>> => {
  // Can't do coinselect simulation without a pubkey
  if (!pubKey)
    return {
      networkFeeCryptoBaseUnit: undefined,
    }

  const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
    // One of many vault addresses - just used as a placeholder for the sake of loosely estimating fees - we *need* a *to* address for simulation or this will throw
    to: 'bc1pfh5x55a3v92klcrdy5yv6yrt7fzr0g929klkdtapp3njfyu4qsyq8qacyf',
    value: sellAmountCryptoBaseUnit,
    chainSpecific: { pubkey: pubKey },
  }

  const feeDataOptions = await sellAdapter.getFeeData(getFeeDataInput)

  const feeData = feeDataOptions['fast']

  return {
    networkFeeCryptoBaseUnit: feeData.txFee,
    chainSpecific: {
      satsPerByte: feeData.chainSpecific.satoshiPerByte,
    },
  }
}
