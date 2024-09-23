import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
import {
  type EvmTransactionRequest,
  type GetEvmTradeQuoteInput,
  type GetTradeQuoteInput,
  type GetUnsignedEvmTransactionArgs,
  type SwapErrorRight,
  type SwapperApi,
  type SwapperDeps,
  SwapperName,
  type TradeQuote,
} from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { fetchFromZrx } from './utils/fetchFromZrx'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { assertGetEvmChainAdapter, config, assetsById }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInput,
      assertGetEvmChainAdapter,
      config.REACT_APP_FEATURE_ZRX_PERMIT2,
      assetsById,
    )

    return tradeQuoteResult.map(tradeQuote => {
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
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const { affiliateBps, receiveAddress, slippageTolerancePercentageDecimal, steps } = tradeQuote
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, permit2 } = steps[0]

    const { value, to, data, estimatedGas } = await (async () => {
      // If this is a Permit2 quote the comment below RE re-fetching does not apply. We must use the
      // original transaction returned in the quote because the Permit2 signature is coupled to it.
      if (permit2) {
        return {
          value: permit2.transaction.value?.toString() ?? '0',
          to: permit2.transaction.to ?? '0x',
          data: permit2.transaction.data ?? '0x',
          estimatedGas: permit2.transaction.gas?.toString() ?? '0',
        }
      }

      // We need to re-fetch the quote from 0x here because actual quote fetches include validation of
      // approvals, which prevent quotes during trade input from succeeding if the user hasn't already
      // approved the token they are getting a quote for.
      // TODO: we'll want to let users know if the quoted amounts change much after re-fetching
      const zrxQuoteResponse = await fetchFromZrx({
        priceOrQuote: 'quote',
        buyAsset,
        sellAsset,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        receiveAddress,
        affiliateBps: affiliateBps ?? '0',
        slippageTolerancePercentageDecimal:
          slippageTolerancePercentageDecimal ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx),
      })

      if (zrxQuoteResponse.isErr()) throw zrxQuoteResponse.unwrapErr()

      return zrxQuoteResponse.unwrap()
    })()

    const { gasLimit, ...feeData } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    // append the signature to the calldata
    const calldataWithSignature = `${data}${(permit2Signature ?? '').replace('0x', '')}`

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
