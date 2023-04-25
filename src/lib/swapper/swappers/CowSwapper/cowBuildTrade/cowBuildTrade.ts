import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { CowSwapQuoteResponse, CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_ETH_MARKER_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import type { CowSwapSellQuoteApiInput } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  getNowPlusThirtyMinutesTimestamp,
  getUsdRate,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'

export async function cowBuildTrade(
  deps: CowSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<CowTrade<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
  const { adapter } = deps
  const { sellAsset, buyAsset, accountNumber, wallet } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } = fromAssetId(
    sellAsset.assetId,
  )

  const { assetReference: buyAssetErc20Address, chainId: buyAssetChainId } = fromAssetId(
    buyAsset.assetId,
  )

  if (sellAssetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: '[cowBuildTrade] - Sell asset needs to be ERC-20 to use CowSwap',
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace },
      }),
    )
  }

  if (buyAssetChainId !== KnownChainIds.EthereumMainnet) {
    return Err(
      makeSwapErrorRight({
        message: '[cowBuildTrade] - Buy asset needs to be on ETH mainnet to use CowSwap',
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAssetChainId },
      }),
    )
  }

  const buyToken =
    buyAsset.assetId !== ethAssetId ? buyAssetErc20Address : COW_SWAP_ETH_MARKER_ADDRESS

  const receiveAddress = await adapter.getAddress({ accountNumber, wallet })

  // https://api.cow.fi/docs/#/default/post_api_v1_quote
  const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
    `${deps.apiUrl}/v1/quote/`,
    {
      sellToken: sellAssetErc20Address,
      buyToken,
      receiver: receiveAddress,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData: DEFAULT_APP_DATA,
      partiallyFillable: false,
      from: receiveAddress,
      kind: ORDER_KIND_SELL,
      sellAmountBeforeFee: sellAmount,
    } as CowSwapSellQuoteApiInput,
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

  const {
    data: {
      quote: {
        buyAmount: buyAmountCryptoBaseUnit,
        sellAmount: quoteSellAmountExcludeFeeCryptoBaseUnit,
        feeAmount: feeAmountInSellTokenCryptoBaseUnit,
      },
    },
  } = maybeQuoteResponse.unwrap()

  const maybeSellAssetUsdRate = await getUsdRate(deps, sellAsset)
  if (maybeSellAssetUsdRate.isErr()) return Err(maybeSellAssetUsdRate.unwrapErr())
  const sellAssetUsdRate = maybeSellAssetUsdRate.unwrap()

  const sellAssetTradeFeeUsd = bnOrZero(feeAmountInSellTokenCryptoBaseUnit)
    .div(bn(10).exponentiatedBy(sellAsset.precision))
    .multipliedBy(bnOrZero(sellAssetUsdRate))
    .toString()

  const buyAmountCryptoPrecision = bn(buyAmountCryptoBaseUnit).div(
    bn(10).exponentiatedBy(buyAsset.precision),
  )
  const quoteSellAmountCryptoPrecision = bn(quoteSellAmountExcludeFeeCryptoBaseUnit).div(
    bn(10).exponentiatedBy(sellAsset.precision),
  )
  const rate = buyAmountCryptoPrecision.div(quoteSellAmountCryptoPrecision).toString()

  const trade: CowTrade<KnownChainIds.EthereumMainnet> = {
    rate,
    feeData: {
      networkFeeCryptoBaseUnit: '0', // no miner fee for CowSwap
      chainSpecific: {}, // no on chain fees for CowSwap
      buyAssetTradeFeeUsd: '0', // Trade fees for buy Asset are always 0 since trade fees are subtracted from sell asset
      sellAssetTradeFeeUsd,
    },
    sellAmountBeforeFeesCryptoBaseUnit: sellAmount,
    buyAmountCryptoBaseUnit,
    sources: DEFAULT_SOURCE,
    buyAsset,
    sellAsset,
    accountNumber,
    receiveAddress,
    feeAmountInSellTokenCryptoBaseUnit,
    sellAmountDeductFeeCryptoBaseUnit: quoteSellAmountExcludeFeeCryptoBaseUnit,
  }

  return Ok(trade)
}
