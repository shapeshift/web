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
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const { affiliateBps, receiveAddress, slippageTolerancePercentageDecimal, steps } = tradeQuote
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = steps[0]

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

    const { value, to, data, estimatedGas } = zrxQuoteResponse.unwrap()

    const { gasLimit, ...feeData } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return {
      to,
      from,
      value,
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      // Use the higher amount of the node or the API, as the node doesn't always provide enought gas padding for
      // total gas used.
      gasLimit: BigNumber.max(gasLimit, estimatedGas).toFixed(),
      ...feeData,
    }
  },

  checkTradeStatus: checkEvmSwapStatus,
}
