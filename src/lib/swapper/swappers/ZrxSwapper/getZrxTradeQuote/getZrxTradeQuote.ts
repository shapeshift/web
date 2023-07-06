import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getTreasuryAddressFromChainId } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxPriceResponse, ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/types'
import {
  AFFILIATE_ADDRESS,
  DEFAULT_SOURCE,
  OPTIMISM_L1_SWAP_GAS_LIMIT,
} from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTrade,
  assetToToken,
  baseUrlFromChainId,
  getAdapter,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import { calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

import { getMinimumCryptoHuman } from '../getMinimumCryptoHuman/getMinimumCryptoHuman'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  input: GetEvmTradeQuoteInput,
  sellAssetUsdRate: string,
): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    chainId,
    supportsEIP1559,
  } = input
  const sellAmountBeforeFeesCryptoBaseUnit = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeAdapter = getAdapter(chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  const minimumCryptoHuman = getMinimumCryptoHuman(sellAssetUsdRate)
  const minimumCryptoBaseUnit = toBaseUnit(minimumCryptoHuman, sellAsset.precision)

  const sellAmountCryptoBaseUnit = bnOrZero(sellAmountBeforeFeesCryptoBaseUnit).eq(0)
    ? minimumCryptoBaseUnit
    : sellAmountBeforeFeesCryptoBaseUnit

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())
  const zrxService = zrxServiceFactory({ baseUrl: maybeBaseUrl.unwrap() })

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-price
  const maybeZrxPriceResponse = await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
    params: {
      buyToken: assetToToken(buyAsset),
      sellToken: assetToToken(sellAsset),
      sellAmount: sellAmountCryptoBaseUnit,
      takerAddress: receiveAddress,
      affiliateAddress: AFFILIATE_ADDRESS, // Used for 0x analytics
      skipValidation: true,
      feeRecipient: getTreasuryAddressFromChainId(buyAsset.chainId), // Where affiliate fees are sent
      buyTokenPercentageFee: convertBasisPointsToDecimalPercentage(affiliateBps).toNumber(),
    },
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const { data } = maybeZrxPriceResponse.unwrap()

  const useSellAmount = !!sellAmountBeforeFeesCryptoBaseUnit
  const rate = useSellAmount ? data.price : bn(1).div(data.price).toString()

  // don't show buy amount if less than min sell amount
  const isSellAmountBelowMinimum = bnOrZero(sellAmountCryptoBaseUnit).lt(minimumCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = isSellAmountBelowMinimum ? '0' : data.buyAmount

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(data.gas).times(1.2).toFixed(),
      l1GasLimit: OPTIMISM_L1_SWAP_GAS_LIMIT,
    })

    return Ok({
      minimumCryptoHuman,
      steps: [
        {
          allowanceContract: data.allowanceTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: {},
          },
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
          sources: data.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
        },
      ],
    } as TradeQuote<T>)
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: tradeQuote] - failed to get fee data',
        cause: err,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
