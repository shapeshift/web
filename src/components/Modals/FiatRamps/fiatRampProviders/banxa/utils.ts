import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, fromAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { QUOTE_TIMEOUT_MS } from 'packages/swapper/src/constants'

import type { GetQuotesArgs, RampQuote } from '../../config'
import type { BanxaQuoteRequest, BanxaQuoteResponse } from './types'

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
  try {
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

    const blockchain = adapters.getBanxaBlockchainFromChainId(
      fromAssetId(crypto as AssetId).chainId,
    )
    if (!blockchain) {
      console.warn(`Blockchain not supported by Banxa for asset ${crypto}`)
      return
    }

    const requestData: BanxaQuoteRequest = {
      fiat_code: fiatCurrency.code,
      coin_code: banxaTicker,
    }

    if (direction === 'buy') {
      requestData.fiat_amount = amount
    } else {
      requestData.coin_amount = amount
    }

    const { data: quote } = await axios.get<BanxaQuoteResponse>(
      `${baseUrl}v2/quotes/${direction}`,
      {
        params: requestData,
        timeout: QUOTE_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getConfig().VITE_BANXA_API_KEY,
        },
      },
    )

    const attributes = quote.data.attributes
    const paymentMethod = attributes.payment_method

    const rate =
      direction === 'buy'
        ? bnOrZero(attributes.crypto.amount).div(attributes.fiat.amount).toString()
        : bnOrZero(attributes.fiat.amount).div(attributes.crypto.amount).toString()

    return {
      id: `banxa-${attributes.fiat.code}-${attributes.crypto.code}-${Date.now()}`,
      provider: 'Banxa',
      providerLogo: banxaLogo,
      rate,
      fiatFee: attributes.fee.value,
      networkFee: '0', // Banxa doesn't separate network fees
      amount: direction === 'buy' ? attributes.crypto.amount : attributes.fiat.amount,
      isBestRate: false,
      isCreditCard: paymentMethod.type === 'card',
      isBankTransfer: paymentMethod.type === 'bank_transfer',
      isApplePay: paymentMethod.name.toLowerCase().includes('apple'),
      isGooglePay: paymentMethod.name.toLowerCase().includes('google'),
      isSepa: paymentMethod.name.toLowerCase().includes('sepa'),
    }
  } catch (e) {
    console.error('Error fetching Banxa quotes:', e)
    return
  }
}
