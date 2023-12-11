import { fromAssetId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import { createTradeAmountTooSmallErr, SwapperName } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import type { CowSwapQuoteResponse } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  ORDER_KIND_SELL,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import {
  assertValidTrade,
  getCowswapNetwork,
  getFullAppData,
  getNowPlusThirtyMinutesTimestamp,
  getSupportedChainIds,
  getValuesFromQuoteResponse,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  isNativeEvmAsset,
  normalizeIntegerAmount,
} from 'lib/swapper/swappers/utils/helpers/helpers'

export async function getCowSwapTradeQuote(
  input: GetTradeQuoteInput,
): Promise<Result<TradeQuote, SwapErrorRight>> {
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

  const { appData, appDataHash } = await getFullAppData()
  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
    `${baseUrl}/${network}/api/v1/quote/`,
    {
      sellToken: fromAssetId(sellAsset.assetId).assetReference,
      buyToken,
      receiver: receiveAddress,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData,
      appDataHash,
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

  const {
    feeAmount: feeAmountInSellTokenCryptoBaseUnit,
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
  } = data.quote

  const { rate, buyAmountBeforeFeesCryptoBaseUnit } = getValuesFromQuoteResponse({
    buyAsset,
    sellAsset,
    response: data,
  })

  const quote: TradeQuote = {
    id: data.id.toString(),
    receiveAddress,
    affiliateBps: undefined,
    potentialAffiliateBps: undefined,
    rate,
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
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
        buyAmountAfterFeesCryptoBaseUnit,
        source: SwapperName.CowSwap,
        buyAsset,
        sellAsset,
        accountNumber,
      },
    ],
  }

  return Ok(quote)
}
