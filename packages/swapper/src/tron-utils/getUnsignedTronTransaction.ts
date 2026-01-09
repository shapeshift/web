import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { GetUnsignedTronTransactionArgs } from '../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../utils'

export const getUnsignedTronTransaction = ({
  stepIndex,
  tradeQuote,
  from,
  assertGetTronChainAdapter,
}: GetUnsignedTronTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const {
    accountNumber,
    sellAsset,
    relayTransactionMetadata,
    nearIntentsSpecific,
    butterSwapTransactionMetadata,
  } = step

  const adapter = assertGetTronChainAdapter(sellAsset.chainId)

  const to =
    relayTransactionMetadata?.to ??
    nearIntentsSpecific?.depositAddress ??
    butterSwapTransactionMetadata?.to
  if (!to) throw new Error('Missing transaction destination address')

  const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit

  // Extract contract address for TRC20 tokens
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

  return adapter.buildSendApiTransaction({
    to,
    from,
    value,
    accountNumber,
    chainSpecific: {
      contractAddress,
    },
  })
}
