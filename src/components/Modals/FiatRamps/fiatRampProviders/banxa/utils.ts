import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, fromAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { QUOTE_TIMEOUT_MS } from 'packages/swapper/src/constants'

import type { GetQuotesArgs, RampQuote } from '../../config'
import type { BanxaQuoteRequest } from './types'

import banxaLogo from '@/assets/banxa.png'
import { getSupportedBanxaFiatCurrencies } from '@/components/Modals/FiatRamps/fiatRampProviders/banxa'
import { getConfig } from '@/config'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { CommonFiatCurrencies } from '@/lib/fiatCurrencies/fiatCurrencies'

/**
 * Get Banxa quote for crypto-fiat conversion
 */
export const getBanxaQuote = async ({
  fiatCurrency,
  crypto,
  amount,
  direction,
}: GetQuotesArgs): Promise<RampQuote | undefined> => {
  const baseUrl = getConfig().VITE_BANXA_API_URL

  const supportedFiatCurrencies = getSupportedBanxaFiatCurrencies()

  if (!supportedFiatCurrencies.includes(fiatCurrency.code as CommonFiatCurrencies)) {
    return
  }

  const banxaTicker = adapters.assetIdToBanxaTicker(crypto as AssetId)
  if (!banxaTicker) {
    console.warn(`Asset ${crypto} not supported by Banxa`)
    return
  }

  const blockchain = adapters.getBanxaBlockchainFromChainId(fromAssetId(crypto as AssetId).chainId)
  if (!blockchain) {
    console.warn(`Blockchain not supported by Banxa for asset ${crypto}`)
    return
  }

  const requestData: BanxaQuoteRequest = {
    partner: 'shapeshift',
    orderType: direction,
    crypto: banxaTicker,
    blockchain,
    fiat: fiatCurrency.code,
    // TODO: Fetch available payment methods, we probably want to display multiple quotes for each payment method then
    paymentMethodId: 'debit-credit-card',
  }

  if (direction === 'buy') {
    requestData.fiatAmount = amount
  } else {
    requestData.cryptoAmount = amount
  }

  // Clean up undefined values from requestData
  const params = Object.fromEntries(
    Object.entries(requestData).filter(([_, value]) => value !== undefined),
  )

  const { data: quote } = await axios.get<any>(`${baseUrl}v2/quotes/${direction}`, {
    params,
    timeout: QUOTE_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getConfig().VITE_BANXA_API_KEY,
    },
  })

  // The API returns a flat response with cryptoAmount, fiatAmount, etc.
  // Check for the expected fields
  if (!quote) {
    console.error('[Banxa] No response from API')
    return
  }

  const cryptoAmount = quote.cryptoAmount
  const fiatAmount = quote.fiatAmount

  const rate =
    direction === 'buy'
      ? bnOrZero(cryptoAmount).div(fiatAmount).toString()
      : bnOrZero(fiatAmount).div(cryptoAmount).toString()

  return {
    id: `banxa-${fiatCurrency.code}-${banxaTicker}-${Date.now()}`,
    provider: 'Banxa',
    providerLogo: banxaLogo,
    rate,
    fiatFee: quote.feeAmount || '0',
    networkFee: '0', // Banxa doesn't separate network fees
    amount: direction === 'buy' ? cryptoAmount : fiatAmount,
    isBestRate: false,
    isCreditCard: true,
    isBankTransfer: false,
    isApplePay: false,
    isGooglePay: false,
    isSepa: false,
  }
}
