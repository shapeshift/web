import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { getConfig } from 'config'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import type { CowChainId } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { getMinimumCryptoHuman } from 'lib/swapper/swappers/CowSwapper/getMinimumCryptoHuman/getMinimumCryptoHuman'
import type { CowSwapQuoteResponse } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import {
  assertValidTrade,
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
  getSupportedChainIds,
  getValuesFromQuoteResponse,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  createEmptyEvmTradeQuote,
  isNativeEvmAsset,
  normalizeIntegerAmount,
} from 'lib/swapper/swappers/utils/helpers/helpers'

export async function getCowSwapTradeQuote(
  input: GetTradeQuoteInput,
  { sellAssetUsdRate, buyAssetUsdRate }: { sellAssetUsdRate: string; buyAssetUsdRate: string },
): Promise<Result<TradeQuote<CowChainId>, SwapErrorRight>> {
  const { sellAsset, buyAsset, accountNumber, chainId, receiveAddress } = input
  const supportedChainIds = getSupportedChainIds()
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTrade({ buyAsset, sellAsset, supportedChainIds, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? fromAssetId(buyAsset.assetId).assetReference
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

  // TODO: use cow quote error to get actual min sell amount as provided by cowswap instead of hardcoded limit
  const minimumCryptoHuman = getMinimumCryptoHuman(
    sellAsset.chainId as CowChainId,
    sellAssetUsdRate,
  )
  const minimumCryptoBaseUnit = toBaseUnit(minimumCryptoHuman, sellAsset.precision)

  // making sure we do not have decimals for cowswap api (can happen at least from minQuoteSellAmount)
  const normalizedSellAmountCryptoBaseUnit = normalizeIntegerAmount(
    bnOrZero(sellAmount).eq(0) ? minimumCryptoBaseUnit : sellAmount,
  )

  const maybeNetwork = getCowswapNetwork(chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())

  const network = maybeNetwork.unwrap()
  const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
    `${baseUrl}/${network}/api/v1/quote/`,
    {
      sellToken: fromAssetId(sellAsset.assetId).assetReference,
      buyToken,
      receiver: receiveAddress,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData: DEFAULT_APP_DATA,
      partiallyFillable: false,
      from: receiveAddress,
      kind: ORDER_KIND_SELL,
      sellAmountBeforeFee: normalizedSellAmountCryptoBaseUnit,
    },
  )

  if (maybeQuoteResponse.isErr()) {
    const err = maybeQuoteResponse.unwrapErr()
    if (
      (err.cause as AxiosError)?.isAxiosError &&
      (err.cause as AxiosError).response?.data.errorType === 'SellAmountDoesNotCoverFee'
    ) {
      return Ok(createEmptyEvmTradeQuote(input, minimumCryptoHuman))
    }
    return Err(maybeQuoteResponse.unwrapErr())
  }

  const { data } = maybeQuoteResponse.unwrap()

  const { feeAmount: feeAmountInSellTokenCryptoBaseUnit } = data.quote

  const { rate, buyAmountBeforeFeesCryptoBaseUnit } = getValuesFromQuoteResponse({
    buyAsset,
    sellAsset,
    response: data,
    sellAssetUsdRate,
    buyAssetUsdRate,
  })

  // don't show buy amount if less than min sell amount
  const isSellAmountBelowMinimum = bnOrZero(sellAmount).lt(minimumCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = isSellAmountBelowMinimum ? '0' : buyAmountBeforeFeesCryptoBaseUnit

  const quote: TradeQuote<CowChainId> = {
    minimumCryptoHuman,
    id: data.id,
    steps: [
      {
        allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
        rate,
        feeData: {
          networkFeeCryptoBaseUnit: '0', // no miner fee for CowSwap
          protocolFees: {
            [sellAsset.assetId]: {
              amountCryptoBaseUnit: feeAmountInSellTokenCryptoBaseUnit,
              requiresBalance: false,
              asset: sellAsset,
            },
          },
        },
        sellAmountBeforeFeesCryptoBaseUnit: normalizedSellAmountCryptoBaseUnit,
        buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
        sources: DEFAULT_SOURCE,
        buyAsset,
        sellAsset,
        accountNumber,
      },
    ],
  }

  return Ok(quote)
}
