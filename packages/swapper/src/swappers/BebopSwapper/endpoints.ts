import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import { fromHex } from 'viem'

import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getBebopTradeQuote } from './getBebopTradeQuote/getBebopTradeQuote'
import { getBebopTradeRate } from './getBebopTradeRate/getBebopTradeRate'

export const bebopApi: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    const tradeQuoteResult = await getBebopTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_BEBOP_API_KEY,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, { assetsById, config }) => {
    const tradeRateResult = await getBebopTradeRate(
      input as GetEvmTradeRateInput,
      assetsById,
      config.VITE_BEBOP_API_KEY,
    )

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, bebopTransactionMetadata } = step
    if (!bebopTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value: hexValue, to, data, gas } = bebopTransactionMetadata
    const value = fromHex(hexValue, 'bigint').toString()

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding
      gasLimit: BigNumber.max(feeData.gasLimit, gas ?? '0').toFixed(),
    })
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, bebopTransactionMetadata } = step
    if (!bebopTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value: hexValue, to, data } = bebopTransactionMetadata
    const value = fromHex(hexValue, 'bigint').toString()

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  checkTradeStatus: checkEvmSwapStatus,
}
