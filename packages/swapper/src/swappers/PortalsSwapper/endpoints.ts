import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'

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
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'
import { getPortalsTradeRate } from './getPortalsTradeRate/getPortalsTradeRate'

export const portalsApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    { config, assertGetEvmChainAdapter }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getPortalsTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      config,
    )

    return tradeQuoteResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    { config, assertGetEvmChainAdapter }: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const tradeRateResult = await getPortalsTradeRate(
      input as GetEvmTradeRateInput,
      assertGetEvmChainAdapter,
      config,
    )

    return tradeRateResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },
  getEvmTransactionFees: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { steps } = tradeQuote
    const { portalsTransactionMetadata } = steps[0]

    if (!portalsTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data } = portalsTransactionMetadata

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { steps } = tradeQuote
    const { portalsTransactionMetadata } = steps[0]

    if (!portalsTransactionMetadata) throw new Error('Transaction metadata is required')

    const {
      value,
      to,
      data,
      // Portals has a 15% buffer on gas estimations, which may or may not turn out to be more reliable than our "pure" simulations
      gasLimit: estimatedGas,
    } = portalsTransactionMetadata

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
