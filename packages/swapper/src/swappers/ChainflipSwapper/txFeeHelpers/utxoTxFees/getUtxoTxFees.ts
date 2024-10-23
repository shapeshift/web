import type {GetFeeDataInput, UtxoChainAdapter} from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'

type GetUtxoTxFeesInput = {
  opReturnData: string
  vault: string
  sellAmountCryptoBaseUnit: string
  sellAdapter: UtxoChainAdapter
  pubkey: string
}

export const getUtxoTxFees = async ({
  opReturnData,
  vault,
  sellAmountCryptoBaseUnit,
  sellAdapter,
  pubkey,
}: GetUtxoTxFeesInput): Promise<string> => {
  const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
    to: vault,
    value: sellAmountCryptoBaseUnit,
    chainSpecific: { pubkey, opReturnData },
  }
  
  const feeDataOptions = await sellAdapter.getFeeData(getFeeDataInput)

  const feeData = feeDataOptions['fast']
  
  return bn(feeData.txFee).dp(0).toString();
}
