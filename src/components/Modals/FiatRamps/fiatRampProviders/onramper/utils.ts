import axios from 'axios'

import type { CommonFiatCurrencies } from '../../config'
import type { OnramperBuyQuoteResponse, OnRamperGatewaysResponse } from './types'

import { getConfig } from '@/config'

// https://docs.onramper.com/reference/get_supported
export const getSupportedOnramperCurrencies = async () => {
  try {
    const baseUrl = getConfig().VITE_ONRAMPER_API_URL
    const apiKey = getConfig().VITE_ONRAMPER_API_KEY
    return (
      await axios.get<OnRamperGatewaysResponse>(`${baseUrl}supported`, {
        headers: {
          Authorization: apiKey,
        },
      })
    ).data
  } catch (e) {
    console.error(e)
  }
}

// https://docs.onramper.com/reference/get_quotes-fiat-crypto
export const getOnramperBuyQuote = async ({
  fiat,
  crypto,
  fiatAmount,
}: {
  fiat: CommonFiatCurrencies
  crypto: string
  fiatAmount: number
}) => {
  try {
    const baseUrl = getConfig().VITE_ONRAMPER_API_URL
    const apiKey = getConfig().VITE_ONRAMPER_API_KEY

    const url = `${baseUrl}quotes/${fiat.toLowerCase()}/${crypto.toLowerCase()}?amount=${fiatAmount}`

    return (
      await axios.get<OnramperBuyQuoteResponse>(url, {
        headers: {
          Authorization: apiKey,
        },
      })
    ).data
  } catch (e) {
    console.error(e)
  }
}
