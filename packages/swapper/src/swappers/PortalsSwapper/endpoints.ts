import type { SignTx } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'

import type {
  CommonTradeQuoteInput,
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
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
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

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
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

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { portalsTransactionMetadata, sellAsset } = step
    if (!portalsTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data } = portalsTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<SignTx<EvmChainId>> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, portalsTransactionMetadata, sellAsset } = step
    if (!portalsTransactionMetadata) throw new Error('Transaction metadata is required')

    // Portals has a 15% buffer on gas estimations, which may or may not turn out to be more reliable than our "pure" simulations
    const { value, to, data, gasLimit: estimatedGas } = portalsTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enought gas padding for total gas used.
      gasLimit: BigNumber.max(feeData.gasLimit, estimatedGas).toFixed(),
    })
  },

  checkTradeStatus: checkEvmSwapStatus,
}
