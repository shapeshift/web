import { evm } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { fromHex } from 'viem'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  SwapperApi,
} from '../../types'
import {
  checkEvmSwapStatus,
  checkSolanaSwapStatus,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getBebopSolanaTradeQuote } from './getBebopSolanaTradeQuote/getBebopSolanaTradeQuote'
import { getBebopSolanaTradeRate } from './getBebopSolanaTradeRate/getBebopSolanaTradeRate'
import { getBebopTradeQuote } from './getBebopTradeQuote/getBebopTradeQuote'
import { getBebopTradeRate } from './getBebopTradeRate/getBebopTradeRate'
import { getUnsignedBebopSolanaTransaction } from './getUnsignedBebopSolanaTransaction'
import { isSolanaChainId } from './utils/helpers/helpers'

export const bebopApi: SwapperApi = {
  getTradeQuote: async (input, deps) => {
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeQuoteResult = await getBebopSolanaTradeQuote(
        input as CommonTradeQuoteInput & { chainId: KnownChainIds.SolanaMainnet },
        deps.assertGetSolanaChainAdapter,
        deps.assetsById,
        deps.config.VITE_BEBOP_API_KEY,
      )
      return tradeQuoteResult.map(tradeQuote => [tradeQuote])
    }

    const tradeQuoteResult = await getBebopTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      deps.assertGetEvmChainAdapter,
      deps.assetsById,
      deps.config.VITE_BEBOP_API_KEY,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, deps) => {
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeRateResult = await getBebopSolanaTradeRate(
        input,
        deps.assertGetSolanaChainAdapter,
        deps.assetsById,
        deps.config.VITE_BEBOP_API_KEY,
      )
      return tradeRateResult.map(tradeRate => [tradeRate])
    }

    const tradeRateResult = await getBebopTradeRate(
      input as GetEvmTradeRateInput,
      deps.assertGetEvmChainAdapter,
      deps.assetsById,
      deps.config.VITE_BEBOP_API_KEY,
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

    if (!gas) {
      throw new Error('Bebop API did not provide gas estimate - cannot execute trade safely')
    }

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding
      gasLimit: BigNumber.max(feeData.gasLimit, gas).toFixed(),
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
  getUnsignedSolanaTransaction: getUnsignedBebopSolanaTransaction,
  getSolanaTransactionFees,
  checkTradeStatus: input => {
    const { chainId } = input
    return isSolanaChainId(chainId) ? checkSolanaSwapStatus(input) : checkEvmSwapStatus(input)
  },
}
