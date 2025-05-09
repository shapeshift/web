import type { GetUnsignedUtxoTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

export const getUtxoTransactionFees = async ({
  stepIndex,
  tradeQuote,
  xpub,
  assertGetUtxoChainAdapter,
  config,
  swapperName,
}: GetUnsignedUtxoTransactionArgs & { swapperName: SwapperName }): Promise<string> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

  const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

  const { vault, opReturnData } = await getThorTxData({
    sellAsset,
    xpub,
    memo,
    config,
    swapperName,
  })

  const { fast } = await adapter.getFeeData({
    to: vault,
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    chainSpecific: { pubkey: xpub, opReturnData },
    sendMax: false,
  })

  return fast.txFee
}
