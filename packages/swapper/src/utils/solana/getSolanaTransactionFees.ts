import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { getSolanaExecutionContext } from './getSolanaExecutionContext'
import { getSolanaNetworkFeeCryptoBaseUnit } from './getSolanaNetworkFeeCryptoBaseUnit'

export const getSolanaTransactionFees = async (
  args: GetUnsignedSolanaTransactionArgs,
): Promise<string> => {
  const { step, adapter, transactionData } = getSolanaExecutionContext(args)

  const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
    adapter,
    from: args.from,
    instructions: transactionData.instructions,
    addressLookupTableAddresses: transactionData.addressLookupTableAddresses,
    tokenId: contractAddressOrUndefined(step.sellAsset.assetId),
  })

  return networkFeeCryptoBaseUnit
}
