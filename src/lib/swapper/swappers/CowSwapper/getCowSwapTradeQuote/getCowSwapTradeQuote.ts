import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowChainId } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { getMinimumAmountCryptoHuman } from 'lib/swapper/swappers/CowSwapper/getMinimumAmountCryptoHuman/getMinimumAmountCryptoHuman'
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
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  isNativeEvmAsset,
  normalizeIntegerAmount,
} from 'lib/swapper/swappers/utils/helpers/helpers'
import {
  selectBuyAssetUsdRate,
  selectSellAssetUsdRate,
} from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { isCowswapSupportedChainId } from '../utils/utils'

export async function getCowSwapTradeQuote(
  input: GetTradeQuoteInput,
  supportedChainIds: CowChainId[],
): Promise<Result<TradeQuote<CowChainId>, SwapErrorRight>> {
  const { sellAsset, buyAsset, accountNumber, chainId, receiveAddress } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const maybeNetwork = getCowswapNetwork(chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())
  const network = maybeNetwork.unwrap()

  const {
    assetReference: sellAssetAddress,
    assetNamespace: sellAssetNamespace,
    chainId: sellAssetChainId,
  } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddress, chainId: buyAssetChainId } = fromAssetId(
    buyAsset.assetId,
  )

  if (sellAssetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: `[getCowSwapTradeQuote] - Sell asset needs to be ERC-20 to use CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace, sellAssetChainId },
      }),
    )
  }

  if (
    !(
      isCowswapSupportedChainId(buyAssetChainId, supportedChainIds) &&
      buyAssetChainId === sellAssetChainId
    )
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[getCowSwapTradeQuote] - Both assets need to be on a network supported by CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAssetChainId },
      }),
    )
  }

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? buyAssetAddress
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

  const maybeMinimumAmountCryptoHuman = getMinimumAmountCryptoHuman(
    sellAsset,
    buyAsset,
    supportedChainIds,
  )

  if (maybeMinimumAmountCryptoHuman.isErr()) return Err(maybeMinimumAmountCryptoHuman.unwrapErr())
  const minimumAmountCryptoHuman = maybeMinimumAmountCryptoHuman.unwrap()

  const minQuoteSellAmount = bnOrZero(minimumAmountCryptoHuman).times(
    bn(10).exponentiatedBy(sellAsset.precision),
  )

  const isSellAmountBelowMinimum = bnOrZero(sellAmount).lt(minQuoteSellAmount)

  // making sure we do not have decimals for cowswap api (can happen at least from minQuoteSellAmount)
  const normalizedSellAmountCryptoBaseUnit = normalizeIntegerAmount(
    isSellAmountBelowMinimum ? minQuoteSellAmount : sellAmount,
  )

  const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
    `${baseUrl}/${network}/api/v1/quote/`,
    {
      sellToken: sellAssetAddress,
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

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

  const {
    data: {
      quote: {
        buyAmount: buyAmountAfterFeesCryptoBaseUnit,
        sellAmount: sellAmountCryptoBaseUnit,
        feeAmount: feeAmountInSellTokenCryptoBaseUnit,
      },
      id,
    },
  } = maybeQuoteResponse.unwrap()

  const quoteSellAmountPlusFeesCryptoBaseUnit = bnOrZero(sellAmountCryptoBaseUnit).plus(
    feeAmountInSellTokenCryptoBaseUnit,
  )

  const buyCryptoAmountAfterFeesCryptoPrecision = bn(buyAmountAfterFeesCryptoBaseUnit).div(
    bn(10).exponentiatedBy(buyAsset.precision),
  )
  const sellCryptoAmountCryptoPrecision = bn(sellAmountCryptoBaseUnit).div(
    bn(10).exponentiatedBy(sellAsset.precision),
  )

  const rate = buyCryptoAmountAfterFeesCryptoPrecision
    .div(sellCryptoAmountCryptoPrecision)
    .toString()

  const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
  const buyAssetUsdRate = selectBuyAssetUsdRate(swapperStore.getState())

  const sellAssetTradeFeeUsd = bnOrZero(feeAmountInSellTokenCryptoBaseUnit)
    .div(bn(10).exponentiatedBy(sellAsset.precision))
    .multipliedBy(bnOrZero(sellAssetUsdRate))
    .toString()

  const feeAmountInBuyTokenCryptoPrecision = bnOrZero(sellAssetTradeFeeUsd).div(
    bnOrZero(buyAssetUsdRate),
  )
  const feeAmountInBuyTokenCryptoBaseUnit = toBaseUnit(
    feeAmountInBuyTokenCryptoPrecision,
    buyAsset.precision,
  )
  const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(feeAmountInBuyTokenCryptoBaseUnit)
    .plus(buyAmountAfterFeesCryptoBaseUnit)
    .toFixed()

  const isQuoteSellAmountBelowMinimum = bnOrZero(quoteSellAmountPlusFeesCryptoBaseUnit).lt(
    minQuoteSellAmount,
  )
  // If isQuoteSellAmountBelowMinimum we don't want to replace it with normalizedSellAmount
  // The purpose of this was to get a quote from CowSwap even with small amounts
  const quoteSellAmountCryptoBaseUnit = isQuoteSellAmountBelowMinimum
    ? sellAmount
    : normalizedSellAmountCryptoBaseUnit

  // Similarly, if isQuoteSellAmountBelowMinimum we can't use the buy amount from the quote
  // because we aren't actually selling the minimum amount (we are attempting to sell an amount less than it)
  const quoteBuyAmountCryptoBaseUnit = isQuoteSellAmountBelowMinimum
    ? '0'
    : buyAmountBeforeFeesCryptoBaseUnit

  const quote: TradeQuote<CowChainId> = {
    minimumCryptoHuman: minimumAmountCryptoHuman,
    id,
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
        sellAmountBeforeFeesCryptoBaseUnit: quoteSellAmountCryptoBaseUnit,
        buyAmountBeforeFeesCryptoBaseUnit: quoteBuyAmountCryptoBaseUnit,
        sources: DEFAULT_SOURCE,
        buyAsset,
        sellAsset,
        accountNumber,
      },
    ],
  }

  return Ok(quote)
}
