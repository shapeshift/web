import type { tron } from '@shapeshiftoss/chain-adapters'

import type { GetUnsignedTronTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

export const getUnsignedTronTransaction = async (
  args: GetUnsignedTronTransactionArgs,
  swapperName: SwapperName,
): Promise<tron.TronSignTx> => {
  const { tradeQuote, stepIndex, from, assertGetTronChainAdapter, config } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

  const { vault } = await getThorTxData({
    sellAsset,
    config,
    swapperName,
  })

  const adapter = assertGetTronChainAdapter(sellAsset.chainId)

  // For TRC20 tokens, extract contract address
  const contractAddress = sellAsset.assetId.includes('/trc20:')
    ? sellAsset.assetId.split('/trc20:')[1]
    : undefined

  return adapter.buildSendApiTransaction({
    to: vault,
    from,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    accountNumber,
    chainSpecific: {
      contractAddress,
      memo,
    },
  })
}
