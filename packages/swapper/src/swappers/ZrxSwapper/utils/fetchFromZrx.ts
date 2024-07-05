import type { Asset } from '@shapeshiftoss/types'
import { convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { SwapErrorRight } from '../../../types'
import { SwapperName } from '../../../types'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type { ZrxPriceResponse, ZrxQuoteResponse, ZrxSupportedChainId } from '../types'
import { AFFILIATE_ADDRESS } from './constants'
import { assetToToken, baseUrlFromChainId } from './helpers/helpers'
import { zrxServiceFactory } from './zrxService'

export type FetchFromZrxArgs<T extends 'price' | 'quote'> = {
  priceOrQuote: T
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string
  affiliateBps: string
  slippageTolerancePercentageDecimal?: string
}

export const fetchFromZrx = async <T extends 'price' | 'quote'>({
  priceOrQuote,
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  slippageTolerancePercentageDecimal,
}: FetchFromZrxArgs<T>): Promise<
  Result<T extends 'quote' ? ZrxQuoteResponse : ZrxPriceResponse, SwapErrorRight>
> => {
  const baseUrl = baseUrlFromChainId(buyAsset.chainId as ZrxSupportedChainId)
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
      buyToken: assetToToken(buyAsset),
      sellToken: assetToToken(sellAsset),
      sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      takerAddress: receiveAddress,
      affiliateAddress: AFFILIATE_ADDRESS, // Used for 0x analytics
      skipValidation: priceOrQuote === 'price', // don't validate allowances for price queries
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
