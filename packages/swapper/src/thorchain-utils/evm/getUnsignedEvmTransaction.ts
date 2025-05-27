import type { SignTx } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'

import { isNativeEvmAsset } from '../../swappers/utils/helpers/helpers'
import type { GetUnsignedEvmTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getEvmData } from './getEvmData'

export const getUnsignedEvmTransaction = async (
  args: GetUnsignedEvmTransactionArgs,
  swapperName: SwapperName,
): Promise<SignTx<EvmChainId>> => {
  const { from, stepIndex, tradeQuote, supportsEIP1559, assertGetEvmChainAdapter, config } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

  const value = isNativeEvmAsset(sellAsset.assetId)
    ? sellAmountIncludingProtocolFeesCryptoBaseUnit
    : '0'

  const { data, to } = await getEvmData({ config, step, tradeQuote, swapperName })

  const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

  const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

  return adapter.buildCustomApiTx({ accountNumber, data, from, to, value, ...feeData })
}
