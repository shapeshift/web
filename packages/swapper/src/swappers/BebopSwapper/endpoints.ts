import { solanaChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import { fromHex } from 'viem'

import type {
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  GetSolanaTradeQuoteInput,
  GetSolanaTradeRateInput,
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
import { isSolanaChainId } from './utils/helpers/helpers'

export const bebopApi: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeQuoteResult = await getBebopSolanaTradeQuote(
        input as GetSolanaTradeQuoteInput,
        assetsById,
        config.VITE_BEBOP_API_KEY,
      )
      return tradeQuoteResult.map(tradeQuote => [tradeQuote])
    }

    const tradeQuoteResult = await getBebopTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_BEBOP_API_KEY,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeRateResult = await getBebopSolanaTradeRate(
        input as GetSolanaTradeRateInput,
        assetsById,
        config.VITE_BEBOP_API_KEY,
      )
      return tradeRateResult.map(tradeRate => [tradeRate])
    }

    const tradeRateResult = await getBebopTradeRate(
      input as GetEvmTradeRateInput,
      assertGetEvmChainAdapter,
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
      gasLimit: BigNumber.max(feeData.gasLimit, gas).toFixed(),
    })
  },
  getUnsignedSolanaMessage: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { bebopSolanaSerializedTx, bebopQuoteId } = step
    if (!bebopSolanaSerializedTx || !bebopQuoteId) {
      throw new Error('Bebop Solana transaction metadata is required')
    }

    return Promise.resolve({
      serializedTx: bebopSolanaSerializedTx,
      quoteId: bebopQuoteId,
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
  checkTradeStatus: input => {
    if (input.chainId === solanaChainId) {
      return checkSolanaSwapStatus({
        txHash: input.txHash,
        address: input.address,
        assertGetSolanaChainAdapter: input.assertGetSolanaChainAdapter,
      })
    }

    return checkEvmSwapStatus(input)
  },
}
