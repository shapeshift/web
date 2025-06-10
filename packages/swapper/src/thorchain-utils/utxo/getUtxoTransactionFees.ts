import type { GetUnsignedUtxoTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

export const getUtxoTransactionFees = async (
  args: GetUnsignedUtxoTransactionArgs,
  swapperName: SwapperName,
): Promise<string> => {
  const { stepIndex, tradeQuote, xpub, assertGetUtxoChainAdapter, config } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

  const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

  const { vault } = await getThorTxData({
    sellAsset,
    config,
    swapperName,
  })

  const { fast } = await adapter.getFeeData({
    to: vault,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    chainSpecific: { pubkey: xpub, opReturnData: memo },
    sendMax: false,
  })

  return fast.txFee
}
