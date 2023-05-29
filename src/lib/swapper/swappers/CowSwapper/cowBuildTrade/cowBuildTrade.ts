import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type {
  CowSwapperDeps,
  CowswapSupportedChainId,
} from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { CowSwapQuoteResponse, CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import {
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import {
  assertValidTradePair,
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  selectBuyAssetUsdRate,
  selectSellAssetUsdRate,
} from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export async function cowBuildTrade<T extends CowswapSupportedChainId>(
  { adapter, baseUrl }: CowSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<CowTrade<T>, SwapErrorRight>> {
  const { sellAsset, buyAsset, feeAsset, accountNumber, receiveAddress } = input
  const network = getCowswapNetwork(adapter)

  if (!receiveAddress)
    return Err(
      makeSwapErrorRight({
        message: 'Receive address is required to build CoW trades',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

  const sellAmountBeforeFeesCryptoBaseUnit = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTradePair({ adapter, buyAsset, sellAsset, feeAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const { assetReference: sellAssetAddress } = fromAssetId(sellAsset.assetId)

  const { assetReference: buyAssetAddress } = fromAssetId(buyAsset.assetId)

  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(`${baseUrl}/${network}/api/v1/quote/`, {
    sellToken: sellAssetAddress,
    buyToken: buyAssetAddress,
    receiver: receiveAddress,
    validTo: getNowPlusThirtyMinutesTimestamp(),
    appData: DEFAULT_APP_DATA,
    partiallyFillable: false,
    from: receiveAddress,
    kind: ORDER_KIND_SELL,
    sellAmountBeforeFee: sellAmountBeforeFeesCryptoBaseUnit,
  })

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

  const {
    data: {
      quote: {
        buyAmount: buyAmountAfterFeesCryptoBaseUnit,
        sellAmount: quoteSellAmountExcludeFeeCryptoBaseUnit,
        feeAmount: feeAmountInSellTokenCryptoBaseUnit,
      },
      id,
    },
  } = maybeQuoteResponse.unwrap()

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

  const quoteSellAmountCryptoPrecision = bn(quoteSellAmountExcludeFeeCryptoBaseUnit).div(
    bn(10).exponentiatedBy(sellAsset.precision),
  )

  const buyCryptoAmountAfterFeesCryptoPrecision = fromBaseUnit(
    buyAmountAfterFeesCryptoBaseUnit,
    buyAsset.precision,
  )
  const rate = bnOrZero(buyCryptoAmountAfterFeesCryptoPrecision)
    .div(quoteSellAmountCryptoPrecision)
    .toString()

  const trade: CowTrade<CowswapSupportedChainId> = {
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
    sellAmountBeforeFeesCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit,
    sources: DEFAULT_SOURCE,
    buyAsset,
    sellAsset,
    accountNumber,
    receiveAddress,
    feeAmountInSellTokenCryptoBaseUnit,
    minimumBuyAmountAfterFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAmountDeductFeeCryptoBaseUnit: quoteSellAmountExcludeFeeCryptoBaseUnit,
    id,
  }

  return Ok(trade as CowTrade<T>)
}
