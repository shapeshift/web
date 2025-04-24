import type { UtxoChainId } from '@shapeshiftoss/types'
import type { GetFeeDataInput } from 'packages/chain-adapters/src/types'

import type { GetRelayUnsignedUtxoTransactionArgs } from './types'

export const getRelayUtxoTransactionFees = async ({
  xpub,
  to,
  opReturnData,
  sellAssetChainId,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  assertGetUtxoChainAdapter,
}: GetRelayUnsignedUtxoTransactionArgs): Promise<string> => {
  const adapter = assertGetUtxoChainAdapter(sellAssetChainId)

  if (!to) throw new Error('Missing transaction destination')
  if (!opReturnData) throw new Error('Missing opReturnData')

  const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
    to,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    chainSpecific: {
      pubkey: xpub,
      opReturnData,
    },
    sendMax: false,
  }

  const feeData = await adapter.getFeeData(getFeeDataInput)

  return feeData.fast.txFee
}
