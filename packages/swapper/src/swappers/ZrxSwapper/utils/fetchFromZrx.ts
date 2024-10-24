import { viemNetworkIdByChainId } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import {
  convertBasisPointsToDecimalPercentage,
  convertDecimalPercentageToBasisPoints,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { SwapErrorRight } from '../../../types'
import { SwapperName } from '../../../types'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type {
  ZrxPermit2PriceResponse,
  ZrxPermit2QuoteResponse,
  ZrxPriceResponse,
  ZrxQuoteResponse,
  ZrxSupportedChainId,
} from '../types'
import { AFFILIATE_ADDRESS } from './constants'
import { assetIdToZrxToken, baseUrlFromChainId } from './helpers/helpers'
import { zrxServiceFactory } from './zrxService'

type FetchFromZrxInput<T extends 'price' | 'quote'> = {
  priceOrQuote: T
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps: string
  slippageTolerancePercentageDecimal: string
  zrxBaseUrl: string
}

type FetchZrxQuoteInput = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string
  zrxBaseUrl: string
}

type FetchZrxPriceInput = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps: string
  slippageTolerancePercentageDecimal: string
  zrxBaseUrl: string
}

const fetchFromZrx = async <T extends 'price' | 'quote'>({
  priceOrQuote,
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  slippageTolerancePercentageDecimal,
  zrxBaseUrl,
}: FetchFromZrxInput<T>): Promise<
  Result<T extends 'quote' ? ZrxQuoteResponse : ZrxPriceResponse, SwapErrorRight>
> => {
  const baseUrl = baseUrlFromChainId(zrxBaseUrl, buyAsset.chainId as ZrxSupportedChainId)
  const zrxService = zrxServiceFactory({ baseUrl })

  const maybeTreasuryAddress = (() => {
    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId)
    } catch (err) {}
  })()

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-quote
  const maybeZrxPriceResponse = await zrxService.get<
    T extends 'quote' ? ZrxQuoteResponse : ZrxPriceResponse
  >(`/swap/v1/${priceOrQuote}`, {
    params: {
      enableSlippageProtection: true,
      buyToken: assetIdToZrxToken(buyAsset.assetId),
      sellToken: assetIdToZrxToken(sellAsset.assetId),
      sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      takerAddress: receiveAddress,
      affiliateAddress: AFFILIATE_ADDRESS, // Used for 0x analytics
      // Always skip validation, so that we can get a quote even if no wallet is connected
      skipValidation: true,
      slippagePercentage:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx),
      ...(maybeTreasuryAddress && {
        feeRecipient: maybeTreasuryAddress, // Where affiliate fees are sent
        feeRecipientTradeSurplus: maybeTreasuryAddress, // Where trade surplus is sent
        buyTokenPercentageFee: convertBasisPointsToDecimalPercentage(affiliateBps).toNumber(),
      }),
    },
  })

  if (maybeZrxPriceResponse.isErr()) {
    return Err(maybeZrxPriceResponse.unwrapErr())
  }

  return Ok(maybeZrxPriceResponse.unwrap().data)
}

export const fetchZrxPermit2Price = (args: FetchZrxPriceInput) =>
  fetchFromZrxPermit2({
    priceOrQuote: 'price',
    ...args,
  })

export const fetchZrxPermit2Quote = (args: FetchZrxQuoteInput) =>
  fetchFromZrxPermit2({
    priceOrQuote: 'quote',
    ...args,
  })

const fetchFromZrxPermit2 = async <T extends 'price' | 'quote'>({
  priceOrQuote,
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  slippageTolerancePercentageDecimal,
  zrxBaseUrl,
}: FetchFromZrxInput<T>): Promise<
  Result<T extends 'quote' ? ZrxPermit2QuoteResponse : ZrxPermit2PriceResponse, SwapErrorRight>
> => {
  const zrxService = zrxServiceFactory({ baseUrl: zrxBaseUrl })

  const maybeTreasuryAddress = (() => {
    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId)
    } catch (err) {}
  })()

  // https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getPrice
  // https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getQuote
  const maybeZrxPriceResponse = await zrxService.get<
    T extends 'quote' ? ZrxPermit2QuoteResponse : ZrxPermit2PriceResponse
  >(`/swap/permit2/${priceOrQuote}`, {
    params: {
      chainId: viemNetworkIdByChainId[sellAsset.chainId],
      buyToken: assetIdToZrxToken(buyAsset.assetId),
      sellToken: assetIdToZrxToken(sellAsset.assetId),
      sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      taker: receiveAddress,
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

export const fetchZrxQuote = (
  input: FetchZrxQuoteInput,
): Promise<Result<ZrxQuoteResponse, SwapErrorRight>> =>
  fetchFromZrx({
    priceOrQuote: 'quote',
    ...input,
  })

export const fetchZrxPrice = (
  input: FetchZrxPriceInput,
): Promise<Result<ZrxPriceResponse, SwapErrorRight>> =>
  fetchFromZrx({
    priceOrQuote: 'price',
    ...input,
  })
