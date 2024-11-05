import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'
import type { Hex } from 'viem'
import { concat, numberToHex, size } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  TradeRate,
} from '../../types'
import {
  type EvmTransactionRequest,
  type GetTradeQuoteInput,
  type GetUnsignedEvmTransactionArgs,
  type SwapErrorRight,
  type SwapperApi,
  type SwapperDeps,
  SwapperName,
  type TradeQuote,
} from '../../types'
import { checkEvmSwapStatus, isExecutableTradeQuote } from '../../utils'
import { getZrxTradeQuote, getZrxTradeRate } from './getZrxTradeQuote/getZrxTradeQuote'
import { fetchZrxQuote } from './utils/fetchFromZrx'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    { assertGetEvmChainAdapter, assetsById, config }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    // TODO(gomes): when we wire this up, this should consume getZrTradeQuote and we should ditch this guy
    // getTradeQuote() is currently consumed at input time (for all swappers, not just ZRX) with weird Frankenstein "quote endpoint fetching ZRX rate endpoint
    // but actually expecting quote input/output" logic. This is a temporary method to get the ZRX swapper working with the new swapper architecture.
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      config.REACT_APP_FEATURE_ZRX_PERMIT2,
      assetsById,
      config.REACT_APP_ZRX_BASE_URL,
    )

    return tradeQuoteResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },
  getTradeRate: async (
    input: GetTradeQuoteInput,
    { assertGetEvmChainAdapter, assetsById, config }: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const tradeRateResult = await getZrxTradeRate(
      input as GetEvmTradeRateInput,
      assertGetEvmChainAdapter,
      config.REACT_APP_FEATURE_ZRX_PERMIT2,
      assetsById,
      config.REACT_APP_ZRX_BASE_URL,
    )

    return tradeRateResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    permit2Signature,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { affiliateBps, receiveAddress, slippageTolerancePercentageDecimal, steps } = tradeQuote
    const {
      buyAsset,
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      transactionMetadata,
    } = steps[0]

    console.log({ tradeQuote })

    const { value, to, data, estimatedGas } = await (async () => {
      // If this is a quote from the 0x V2 API, i.e. has `transactionMetadata`, the comment below RE
      // re-fetching does not apply. We must use the original transaction returned in the quote
      // because the Permit2 signature is coupled to it.
      if (transactionMetadata) {
        return {
          value: transactionMetadata.value?.toString() ?? '0',
          to: transactionMetadata.to ?? '0x',
          data: transactionMetadata.data ?? '0x',
          estimatedGas: transactionMetadata.gas?.toString() ?? '0',
        }
      }

      // We need to re-fetch the quote from 0x here because actual quote fetches include validation of
      // approvals, which prevent quotes during trade input from succeeding if the user hasn't already
      // approved the token they are getting a quote for.
      // TODO: we'll want to let users know if the quoted amounts change much after re-fetching
      const zrxQuoteResponse = await fetchZrxQuote({
        buyAsset,
        sellAsset,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        receiveAddress,
        affiliateBps: affiliateBps ?? '0',
        slippageTolerancePercentageDecimal:
          slippageTolerancePercentageDecimal ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx),
        zrxBaseUrl: config.REACT_APP_ZRX_BASE_URL,
      })

      if (zrxQuoteResponse.isErr()) throw zrxQuoteResponse.unwrapErr()

      return zrxQuoteResponse.unwrap()
    })()

    const calldataWithSignature = (() => {
      if (!permit2Signature) return data

      // Append the signature to the calldata
      // For details, see
      // https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api#5-append-signature-length-and-signature-data-to-transactiondata
      const signatureLengthInHex = numberToHex(size(permit2Signature as Hex), {
        signed: false,
        size: 32,
      })
      return concat([data, signatureLengthInHex, permit2Signature] as Hex[])
    })()

    // Gas estimation
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
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for
      // total gas used.
      gasLimit: BigNumber.max(gasLimit, estimatedGas).toFixed(),
      ...feeData,
    }
  },

  checkTradeStatus: checkEvmSwapStatus,
}
