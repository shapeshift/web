import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowChainId } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { CowSwapQuoteResponse, CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
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
  selectBuyAssetUsdRate,
  selectSellAssetUsdRate,
} from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/zustand/swapperStore/utils'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { isCowswapSupportedChainId } from '../utils/utils'

export async function cowBuildTrade<T extends CowChainId>(
  input: BuildTradeInput,
  supportedChainIds: CowChainId[],
): Promise<Result<CowTrade<T>, SwapErrorRight>> {
  const { accountNumber, sellAsset, buyAsset, slippage, receiveAddress, chainId } = input

  const maybeNetwork = getCowswapNetwork(chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())
  const network = maybeNetwork.unwrap()

  if (!receiveAddress)
    return Err(
      makeSwapErrorRight({
        message: 'Receive address is required to build CoW trades',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

  const sellAmountBeforeFeesCryptoBaseUnit = input.sellAmountBeforeFeesCryptoBaseUnit

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
        message: `[cowBuildTrade] - Sell asset needs to be ERC-20 to use CowSwap`,
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
        message: `[cowBuildTrade] - Both assets need to be on a network supported by CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAssetChainId },
      }),
    )
  }

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? buyAssetAddress
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

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
      sellAmountBeforeFee: sellAmountBeforeFeesCryptoBaseUnit,
    },
  )

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

  const slippageBps = convertDecimalPercentageToBasisPoints(slippage ?? '0').toString()

  const minimumBuyAmountAfterFeesCryptoBaseUnit = subtractBasisPointAmount(
    buyAmountAfterFeesCryptoBaseUnit,
    slippageBps,
    true,
  )

  const trade: CowTrade<CowChainId> = {
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
    sellAmountDeductFeeCryptoBaseUnit: quoteSellAmountExcludeFeeCryptoBaseUnit,
    id,
    minimumBuyAmountAfterFeesCryptoBaseUnit,
  }

  return Ok(trade as CowTrade<T>)
}
