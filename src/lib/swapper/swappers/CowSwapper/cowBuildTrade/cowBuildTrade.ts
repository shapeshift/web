import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
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
  assertValidTrade,
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
  getSupportedChainIds,
  getValuesFromQuoteResponse,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/zustand/swapperStore/utils'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'

export async function cowBuildTrade<T extends CowChainId>(
  input: BuildTradeInput,
): Promise<Result<CowTrade<T>, SwapErrorRight>> {
  const { accountNumber, sellAsset, buyAsset, slippage, receiveAddress, chainId } = input
  const supportedChainIds = getSupportedChainIds()
  const sellAmountBeforeFeesCryptoBaseUnit = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTrade({ buyAsset, sellAsset, supportedChainIds, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? fromAssetId(buyAsset.assetId).assetReference
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

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
      sellAmountBeforeFee: sellAmountBeforeFeesCryptoBaseUnit,
    },
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

  const { data } = maybeQuoteResponse.unwrap()

  const {
    sellAmount: sellAmountDeductFeeCryptoBaseUnit,
    feeAmount: feeAmountInSellTokenCryptoBaseUnit,
  } = data.quote

  const { rate, buyAmountBeforeFeesCryptoBaseUnit, buyAmountAfterFeesCryptoBaseUnit } =
    getValuesFromQuoteResponse({
      buyAsset,
      sellAsset,
      response: data,
    })

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
    sellAmountDeductFeeCryptoBaseUnit,
    id: data.id,
    minimumBuyAmountAfterFeesCryptoBaseUnit,
  }

  return Ok(trade as CowTrade<T>)
}
