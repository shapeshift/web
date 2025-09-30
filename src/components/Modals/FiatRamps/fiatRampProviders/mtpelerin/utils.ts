import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { QUOTE_TIMEOUT_MS } from 'packages/swapper/src/constants'

import type { GetQuotesArgs, RampQuote } from '../../config'
import type { MtPelerinQuoteResponse, MtPelerinSellLimitsResponse } from './types'

import MtPelerinLogo from '@/assets/mtpelerin.png'
import { getMtPelerinFiatCurrencies } from '@/components/Modals/FiatRamps/fiatRampProviders/mtpelerin'
import { getConfig } from '@/config'
import { bnOrZero } from '@/lib/bignumber/bignumber'

/**
 * Get minimum sell limits for a currency from Mt Pelerin API
 */
const getMtPelerinSellLimits = async (currency: string): Promise<string | null> => {
  try {
    const baseUrl = getConfig().VITE_MTPELERIN_API_URL
    const response = await axios.get<MtPelerinSellLimitsResponse>(
      `${baseUrl}/currency_rates/sellLimits/${currency}`,
      {
        timeout: QUOTE_TIMEOUT_MS,
      },
    )
    return response.data.limit
  } catch (e) {
    console.error('Error fetching Mt Pelerin sell limits:', e)
    return null
  }
}

/**
 * Get Mt Pelerin quote for crypto<->fiat conversion
 */
export const getMtPelerinQuote = async ({
  fiatCurrency,
  crypto,
  amount,
  direction,
}: GetQuotesArgs): Promise<RampQuote | undefined> => {
  try {
    const baseUrl = getConfig().VITE_MTPELERIN_API_URL

    const supportedFiatCurrencies = getMtPelerinFiatCurrencies()

    if (!supportedFiatCurrencies.includes(fiatCurrency.code)) {
      return
    }

    // Get the Mt Pelerin symbol for the crypto asset
    const mtPelerinSymbol = adapters.assetIdToMtPelerinSymbol(crypto as AssetId)
    if (!mtPelerinSymbol) {
      console.warn(`Asset ${crypto} not supported by Mt Pelerin`)
      return
    }

    // Get the network for the asset
    const network = adapters.getMtPelerinNetFromAssetId(crypto as AssetId)
    if (!network) {
      console.warn(`Network not supported by Mt Pelerin for asset ${crypto}`)
      return
    }

    if (bnOrZero(amount).lte(0)) {
      console.warn(`Amount ${amount} is less than or equal to 0`)
      return
    }

    const requestData = {
      sourceCurrency: direction === 'buy' ? fiatCurrency.code : mtPelerinSymbol,
      destCurrency: direction === 'buy' ? mtPelerinSymbol : fiatCurrency.code,
      sourceAmount: parseFloat(amount),
      sourceNetwork: direction === 'buy' ? 'fiat' : network,
      destNetwork: direction === 'buy' ? network : 'fiat',
      isCardPayment: false, // Mt Pelerin doesn't support card payments
    }

    const { data: quote } = await axios.post<MtPelerinQuoteResponse>(
      `${baseUrl}/currency_rates/convert`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    // Check minimum sell limits for off-ramp
    if (direction === 'sell') {
      const minLimit = await getMtPelerinSellLimits(fiatCurrency.code)
      if (minLimit && bnOrZero(quote.destAmount).lt(bnOrZero(minLimit))) {
        console.warn(`Amount ${amount} is below minimum limit ${minLimit} for ${fiatCurrency.code}`)
        return
      }
    }

    return {
      id: `mtpelerin-${quote.sourceCurrency}-${quote.destCurrency}-${Date.now()}`,
      provider: 'MtPelerin',
      providerLogo: MtPelerinLogo,
      rate:
        direction === 'buy'
          ? bnOrZero(quote.sourceAmount).div(quote.destAmount).toString()
          : bnOrZero(quote.destAmount).div(quote.sourceAmount).toString(),
      fiatFee: quote.fees.fixFee.toString(),
      networkFee: quote.fees.networkFee,
      amount: quote.destAmount,
      isBestRate: false,
      isCreditCard: true,
      isBankTransfer: true,
      isApplePay: true,
      isGooglePay: true,
      isSepa: true,
    }
  } catch (e) {
    console.error('Error fetching Mt Pelerin quotes:', e)
    return
  }
}
