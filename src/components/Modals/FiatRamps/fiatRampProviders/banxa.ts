import { adapters, fromAssetId } from '@shapeshiftoss/caip'

import { FiatRampAction } from '../FiatRampsCommon'
import type { CreateUrlProps } from '../types'

import type { CommonFiatCurrencies } from '@/lib/fiatCurrencies/fiatCurrencies'

export const getSupportedBanxaFiatCurrencies = (): CommonFiatCurrencies[] => {
  return [
    'AED',
    'AUD',
    'BRL',
    'CAD',
    'CHF',
    'CZK',
    'DKK',
    'EUR',
    'GBP',
    'HKD',
    'IDR',
    'INR',
    'JPY',
    'KRW',
    'MXN',
    'MYR',
    'NOK',
    'NZD',
    'PHP',
    'PLN',
    'QAR',
    'SAR',
    'SEK',
    'SGD',
    'THB',
    'TRY',
    'TWD',
    'USD',
    'VND',
    'ZAR',
  ]
}

export const createBanxaUrl = ({
  assetId,
  address,
  action,
  fiatCurrency,
  fiatAmount,
  amountCryptoPrecision,
}: CreateUrlProps): string => {
  const asset = adapters.assetIdToBanxaTicker(assetId)
  if (!asset) throw new Error('Asset not supported by Banxa')
  const BANXA_BASE_URL = new URL('https://shapeshift.banxa.com/')

  const params = new URLSearchParams()
  const isSell = action === FiatRampAction.Sell

  if (isSell) {
    params.set('orderType', 'sell')
  }

  /**
   * note (0xdef1cafe): as of 2022/05/12 - USD for sell is not supported
   * and will default to whatever local currency is available
   * vendor problem - nothing we can do
   */
  params.set('fiatType', fiatCurrency || 'USD')
  params.set('coinType', asset)

  if (address) {
    params.set('walletAddress', address)
  }

  /**
   * select the blockchain from ChainId and pass it to the banxa,
   * since some Banxa assets could be on multiple chains and their default
   * chain won't be exactly the same as ours.
   */
  params.set('blockchain', adapters.getBanxaBlockchainFromChainId(fromAssetId(assetId).chainId))

  if (fiatAmount) {
    params.set('fiatAmount', fiatAmount)
  }
  if (amountCryptoPrecision) {
    params.set('coinAmount', amountCryptoPrecision)
  }

  return `${BANXA_BASE_URL.toString()}?${params.toString()}`
}
