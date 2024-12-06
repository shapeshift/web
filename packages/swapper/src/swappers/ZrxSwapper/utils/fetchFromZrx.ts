import { viemNetworkIdByChainId } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type { ZrxPriceResponse, ZrxQuoteResponse } from '../types'
import { assetIdToZrxToken } from './helpers/helpers'
import { zrxServiceFactory } from './zrxService'

type FetchFromZrxInput<T extends 'rate' | 'quote'> = {
  quoteOrRate: T
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAddress: string | undefined
  affiliateBps: string
  slippageTolerancePercentageDecimal: string
  zrxBaseUrl: string
}

type FetchZrxQuoteInput = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAddress: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string
  zrxBaseUrl: string
}

type FetchZrxPriceInput = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAddress: string | undefined
  affiliateBps: string
  slippageTolerancePercentageDecimal: string
  zrxBaseUrl: string
}

const fetchFromZrx = async <T extends 'rate' | 'quote'>({
  quoteOrRate,
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAddress,
  affiliateBps,
  slippageTolerancePercentageDecimal,
  zrxBaseUrl,
}: FetchFromZrxInput<T>): Promise<
  Result<T extends 'quote' ? ZrxQuoteResponse : ZrxPriceResponse, SwapErrorRight>
> => {
  const zrxService = zrxServiceFactory({ baseUrl: zrxBaseUrl })

  const maybeTreasuryAddress = (() => {
    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId)
    } catch (err) {}
  })()

  // Rates are gotten using ZRX /swap/permit2/price endpoint
  const endpoint = quoteOrRate === 'quote' ? 'quote' : 'price'

  // https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getPrice
  // https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getQuote
  const maybeZrxPriceResponse = await zrxService.get<
    T extends 'quote' ? ZrxQuoteResponse : ZrxPriceResponse
  >(`/swap/permit2/${endpoint}`, {
    params: {
      chainId: viemNetworkIdByChainId[sellAsset.chainId],
      buyToken: assetIdToZrxToken(buyAsset.assetId),
      sellToken: assetIdToZrxToken(sellAsset.assetId),
      sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      taker: sellAddress,
      swapFeeBps: parseInt(affiliateBps),
      swapFeeToken: assetIdToZrxToken(buyAsset.assetId), // must be set to the buy asset to simplify fee calcs
      slippageBps: convertDecimalPercentageToBasisPoints(
        slippageTolerancePercentageDecimal,
      ).toNumber(),
      swapFeeRecipient: maybeTreasuryAddress, // Where affiliate fees are sent
      feeRecipientTradeSurplus: maybeTreasuryAddress, // Where trade surplus is sent
    },
  })

  if (maybeZrxPriceResponse.isErr()) {
    return Err(maybeZrxPriceResponse.unwrapErr())
  }

  return Ok(maybeZrxPriceResponse.unwrap().data)
}

export const fetchZrxPrice = (args: FetchZrxPriceInput) => {
  return fetchFromZrx({
    quoteOrRate: 'rate',
    ...args,
  })
}

export const fetchZrxQuote = (args: FetchZrxQuoteInput) => {
  return fetchFromZrx({
    quoteOrRate: 'quote',
    ...args,
  })
}
