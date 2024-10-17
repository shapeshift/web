import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { fetchFromZrx } from '../utils/fetchFromZrx'
import { isSupportedChainId } from '../utils/helpers/helpers'

export async function getZrxTradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
): Promise<Result<TradeQuote | TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const maybeZrxPriceResponse = await fetchFromZrx({
    priceOrQuote: 'price',
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxQuoteResponse = maybeZrxPriceResponse.unwrap()

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    grossBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    price,
    allowanceTarget,
    gas,
    expectedSlippage,
    auxiliaryChainData,
  } = zrxQuoteResponse

  const useSellAmount = !!sellAmountIncludingProtocolFeesCryptoBaseUnit
  const rate = useSellAmount ? price : bn(1).div(price).toString()

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(gas).times(1.2).toFixed(),
    })

    return Ok({
      id: uuid(),
      receiveAddress,
      potentialAffiliateBps,
      affiliateBps,
      // Slippage protection is only provided for specific pairs.
      // If slippage protection is not provided, assume a no slippage limit.
      // If slippage protection is provided, return the limit instead of the estimated slippage.
      // https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-quote
      slippageTolerancePercentageDecimal: expectedSlippage
        ? slippageTolerancePercentageDecimal
        : undefined,
      rate,
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract: allowanceTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: bn(networkFeeCryptoBaseUnit)
              .plus(auxiliaryChainData.l1GasEstimate ?? 0)
              .toFixed(),
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Zrx,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
