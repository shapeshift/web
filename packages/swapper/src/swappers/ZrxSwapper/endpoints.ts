import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'
import type { Hex } from 'viem'
import { concat, numberToHex, size } from 'viem'

import type {
  CommonTradeQuoteInput,
  EvmTransactionRequest,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../types'
import { checkEvmSwapStatus, isExecutableTradeQuote } from '../../utils'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getZrxTradeRate } from './getZrxTradeRate/getZrxTradeRate'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    { assertGetEvmChainAdapter, assetsById, config }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.REACT_APP_ZRX_BASE_URL,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    { assetsById, config }: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const tradeRateResult = await getZrxTradeRate(
      input as GetEvmTradeRateInput,
      assetsById,
      config.REACT_APP_ZRX_BASE_URL,
    )

    return tradeRateResult.map(tradeQuote => [tradeQuote])
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    permit2Signature,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { steps } = tradeQuote
    const { zrxTransactionMetadata: transactionMetadata } = steps[0]

    if (!transactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data, gas: estimatedGas } = transactionMetadata

    const calldataWithSignature = (() => {
      if (!permit2Signature) return data

      // Append the signature to the calldata
      // https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api#5-append-signature-length-and-signature-data-to-transactiondata
      const signatureLengthInHex = numberToHex(size(permit2Signature as Hex), {
        signed: false,
        size: 32,
      })

      return concat([data, signatureLengthInHex, permit2Signature] as Hex[])
    })()

    const { gasLimit, ...feeData } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: calldataWithSignature,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return {
      to,
      from,
      value,
      data: calldataWithSignature,
      chainId: Number(fromChainId(chainId).chainReference),
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for total gas used.
      gasLimit: BigNumber.max(gasLimit, estimatedGas ?? '0').toFixed(),
      ...feeData,
    }
  },
  getEvmTransactionFees: async ({
    chainId,
    from,
    tradeQuote,
    permit2Signature,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { steps } = tradeQuote
    const { zrxTransactionMetadata: transactionMetadata } = steps[0]

    if (!transactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data } = transactionMetadata

    const calldataWithSignature = (() => {
      if (!permit2Signature) return data

      // Append the signature to the calldata
      // https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api#5-append-signature-length-and-signature-data-to-transactiondata
      const signatureLengthInHex = numberToHex(size(permit2Signature as Hex), {
        signed: false,
        size: 32,
      })

      return concat([data, signatureLengthInHex, permit2Signature] as Hex[])
    })()

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: calldataWithSignature,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },

  checkTradeStatus: checkEvmSwapStatus,
}
