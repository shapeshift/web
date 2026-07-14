import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { GetUnsignedTronTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

export const getTronTransactionFees = async (
  args: GetUnsignedTronTransactionArgs,
  swapperName: SwapperName,
): Promise<string> => {
  const { tradeQuote, stepIndex, config, from, assertGetTronChainAdapter } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

  const { vault } = await getThorTxData({ sellAsset, config, swapperName })

  const adapter = assertGetTronChainAdapter(sellAsset.chainId)
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

  const feeData = await adapter.getFeeData({
    to: vault,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    chainSpecific: {
      from,
      contractAddress,
      memo,
    },
  })

  return feeData.fast.txFee
}
