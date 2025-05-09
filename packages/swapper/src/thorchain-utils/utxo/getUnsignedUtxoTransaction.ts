import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'

import type { GetUnsignedUtxoTransactionArgs, SwapperName, UtxoFeeData } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

export const getUnsignedUtxoTransaction = async ({
  tradeQuote,
  stepIndex,
  xpub,
  accountType,
  assertGetUtxoChainAdapter,
  config,
  swapperName,
}: GetUnsignedUtxoTransactionArgs & { swapperName: SwapperName }): Promise<SignTx<UtxoChainId>> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } = step

  const { vault, opReturnData } = await getThorTxData({
    sellAsset,
    xpub,
    memo,
    config,
    swapperName,
  })

  return assertGetUtxoChainAdapter(sellAsset.chainId).buildSendApiTransaction({
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    xpub,
    to: vault,
    accountNumber,
    // skip address validation for vault addresses as they may exceed the risk score threshold, but are still valid for use
    skipToAddressValidation: true,
    chainSpecific: {
      accountType,
      opReturnData,
      satoshiPerByte: (feeData.chainSpecific as UtxoFeeData).satsPerByte,
    },
  })
}
