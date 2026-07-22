import type { GetUnsignedUtxoTransactionArgs } from '../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../utils'

export const getUtxoExecutionContext = async ({
  stepIndex,
  tradeQuote,
  xpub,
  assertGetUtxoChainAdapter,
}: GetUnsignedUtxoTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (transactionData?.type !== 'utxo') throw new Error('invalid utxo transaction')

  const { to, value, opReturnData } = transactionData

  const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

  const { fast } = await adapter.getFeeData({
    to,
    value,
    chainSpecific: { pubkey: xpub, opReturnData },
    sendMax: false,
  })

  return { step, adapter, transactionData, feeData: fast }
}
