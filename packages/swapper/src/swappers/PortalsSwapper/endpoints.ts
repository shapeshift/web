import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import { getFees } from '@shapeshiftoss/utils/src/evm'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'
import { zeroAddress } from 'viem'

import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
} from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../utils/helpers/helpers'
import { chainIdToPortalsNetwork } from './constants'
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'
import { fetchPortalsTradeOrder } from './utils/fetchPortalsTradeOrder'

export const portalsApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { config, assertGetEvmChainAdapter }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getPortalsTradeQuote(
      input as GetEvmTradeQuoteInput,
      assertGetEvmChainAdapter,
      config,
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
    config: swapperConfig,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const { affiliateBps, slippageTolerancePercentageDecimal, steps } = tradeQuote
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = steps[0]

    const portalsNetwork = chainIdToPortalsNetwork[chainId as KnownChainIds]
    const sellAssetAddress = isNativeEvmAsset(sellAsset.assetId)
      ? zeroAddress
      : fromAssetId(sellAsset.assetId).assetReference
    const buyAssetAddress = isNativeEvmAsset(buyAsset.assetId)
      ? zeroAddress
      : fromAssetId(buyAsset.assetId).assetReference
    const inputToken = `${portalsNetwork}:${sellAssetAddress}`
    const outputToken = `${portalsNetwork}:${buyAssetAddress}`

    // Not a decimal percentage, just a good ol' percentage e.g 1 for 1%
    const affiliateBpsPercentage = convertBasisPointsToDecimalPercentage(affiliateBps)
      .times(100)
      .toNumber()
    // We need to re-fetch the quote from Portals here with validation
    // approvals, which prevent quotes during trade input from succeeding if the user hasn't already
    // approved the token they are getting a quote for.
    // TODO: we'll want to let users know if the quoted amounts change much after re-fetching
    const portalsTradeOrderResponse = await fetchPortalsTradeOrder({
      sender: from,
      inputToken,
      outputToken,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: Number(slippageTolerancePercentageDecimal) * 100,
      partner: getTreasuryAddressFromChainId(sellAsset.chainId),
      feePercentage: affiliateBpsPercentage,
      validate: true,
      swapperConfig,
    })

    if (!portalsTradeOrderResponse.tx) throw new Error('Portals Tx simulation failed upstream')

    const {
      value,
      to,
      data,
      // Portals has a 15% buffer on gas estimations, which may or may not turn out to be more reliable than our "pure" simulations
      gasLimit: estimatedGas,
    } = portalsTradeOrderResponse.tx

    const { gasLimit, ...feeData } = await getFees({
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
