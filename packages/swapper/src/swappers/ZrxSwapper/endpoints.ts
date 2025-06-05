import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import type { Hex } from 'viem'
import { concat, numberToHex, size } from 'viem'

import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getZrxTradeRate } from './getZrxTradeRate/getZrxTradeRate'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_ZRX_BASE_URL,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, { assetsById, config }) => {
    const tradeRateResult = await getZrxTradeRate(
      input as GetEvmTradeRateInput,
      assetsById,
      config.VITE_ZRX_BASE_URL,
    )

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    permit2Signature,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, zrxTransactionMetadata } = step
    if (!zrxTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to } = zrxTransactionMetadata

    const data = (() => {
      if (!permit2Signature) return zrxTransactionMetadata.data

      // Append the signature to the calldata
      // https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api#5-append-signature-length-and-signature-data-to-transactiondata
      const signatureLengthInHex = numberToHex(size(permit2Signature as Hex), {
        signed: false,
        size: 32,
      })

      return concat([zrxTransactionMetadata.data, signatureLengthInHex, permit2Signature] as Hex[])
    })()

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for total gas used.
      gasLimit: BigNumber.max(feeData.gasLimit, zrxTransactionMetadata.gas ?? '0').toFixed(),
    })
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    permit2Signature,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, zrxTransactionMetadata } = step
    if (!zrxTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to } = zrxTransactionMetadata

    const data = (() => {
      if (!permit2Signature) return zrxTransactionMetadata.data

      // Append the signature to the calldata
      // https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api#5-append-signature-length-and-signature-data-to-transactiondata
      const signatureLengthInHex = numberToHex(size(permit2Signature as Hex), {
        signed: false,
        size: 32,
      })

      return concat([zrxTransactionMetadata.data, signatureLengthInHex, permit2Signature] as Hex[])
    })()

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  checkTradeStatus: checkEvmSwapStatus,
}
