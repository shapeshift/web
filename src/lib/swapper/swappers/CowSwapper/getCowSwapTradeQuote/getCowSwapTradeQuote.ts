import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import type { CowChainId, CowSwapQuoteResponse } from 'lib/swapper/swappers/CowSwapper/types'
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
  isNativeEvmAsset,
  normalizeIntegerAmount,
} from 'lib/swapper/swappers/utils/helpers/helpers'
import { createTradeAmountTooSmallErr } from 'lib/swapper/utils'

export async function getCowSwapTradeQuote(
  input: GetTradeQuoteInput,
  { sellAssetUsdRate, buyAssetUsdRate }: { sellAssetUsdRate: string; buyAssetUsdRate: string },
): Promise<Result<TradeQuote<CowChainId>, SwapErrorRight>> {
  const { sellAsset, buyAsset, accountNumber, chainId, receiveAddress } = input
  const supportedChainIds = getSupportedChainIds()
  const sellAmount = input.sellAmountIncludingProtocolFeesCryptoBaseUnit

  const assertion = assertValidTrade({ buyAsset, sellAsset, supportedChainIds, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? fromAssetId(buyAsset.assetId).assetReference
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

  // making sure we do not have decimals for cowswap api (can happen at least from minQuoteSellAmount)
  const normalizedSellAmountCryptoBaseUnit = normalizeIntegerAmount(sellAmount)

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
    const errData = (err.cause as AxiosError)?.response?.data
    if (
      (err.cause as AxiosError)?.isAxiosError &&
      errData?.errorType === 'SellAmountDoesNotCoverFee'
    ) {
      return Err(
        createTradeAmountTooSmallErr({
          assetId: sellAsset.assetId,
          minAmountCryptoBaseUnit: bn(errData?.data.fee_amount ?? '0x0', 16).toFixed(),
        }),
      )
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

  const quote: TradeQuote<CowChainId> = {
    id: data.id.toString(),
    rate,
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
        sellAmountIncludingProtocolFeesCryptoBaseUnit: normalizedSellAmountCryptoBaseUnit,
        buyAmountBeforeFeesCryptoBaseUnit,
        sources: DEFAULT_SOURCE,
        buyAsset,
        sellAsset,
        accountNumber,
      },
    ],
  }

  return Ok(quote)
}
