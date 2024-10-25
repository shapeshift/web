import type {GetFeeDataInput, UtxoChainAdapter} from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'

type GetUtxoTxFeesInput = {
  sellAmountCryptoBaseUnit: string
  sellAdapter: UtxoChainAdapter,
  publicKey: string
}

export const getUtxoTxFees = async ({
  sellAmountCryptoBaseUnit,
  sellAdapter,
  publicKey
}: GetUtxoTxFeesInput): Promise<string> => {
  // TODO: Get Chainflip BTC vault address
  const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
    to: 'vault',
    value: sellAmountCryptoBaseUnit,
    chainSpecific: { pubkey: publicKey },
  }
  
  const feeDataOptions = await sellAdapter.getFeeData(getFeeDataInput)

  const feeData = feeDataOptions['fast']
  
  return bn(feeData.txFee).dp(0).toString();
}
