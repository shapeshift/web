import { tronAssetId } from '@shapeshiftoss/caip'
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

  if (butterSwapTransactionMetadata) {
    const { to, data, method, args } = butterSwapTransactionMetadata

    if (!to) throw new Error('Missing Butter swap contract address')
    if (!data) throw new Error('Missing Butter swap transaction data')

    const isNativeTron = sellAsset.assetId === tronAssetId
    const value = isNativeTron ? step.sellAmountIncludingProtocolFeesCryptoBaseUnit : '0'

    return adapter.buildCustomApiTx({
      from,
      to,
      accountNumber,
      data,
      value,
      method,
      args,
    })
  }

  const to = relayTransactionMetadata?.to ?? nearIntentsSpecific?.depositAddress
  if (!to) throw new Error('Missing transaction destination address')

  const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit

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
