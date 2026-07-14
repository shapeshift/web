import { evm } from '@shapeshiftoss/chain-adapters'

import { isNativeEvmAsset } from '../../swappers/utils/helpers/helpers'
import type { GetUnsignedEvmTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorEvmTradeQuote } from '../types'
import { getEvmData } from './getEvmData'

export const getEvmTransactionFees = async (
  args: GetUnsignedEvmTransactionArgs,
  swapperName: SwapperName,
): Promise<string> => {
  const { from, stepIndex, supportsEIP1559, assertGetEvmChainAdapter, config } = args
  const tradeQuote = args.tradeQuote as ThorEvmTradeQuote

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

  // L1ToL1 quotes carry the executable tx directly; longtail rebuilds it at execution time
  const { data, to } =
    transactionData?.type === 'evm'
      ? transactionData
      : await getEvmData({ config, step, tradeQuote, swapperName })

  const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

  const value = isNativeEvmAsset(sellAsset.assetId)
    ? sellAmountIncludingProtocolFeesCryptoBaseUnit
    : '0'

  const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

  return feeData.networkFeeCryptoBaseUnit
}
