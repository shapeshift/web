import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import head from 'lodash/head'

import { FiatRampAction } from '../../FiatRampsCommon'
import type { CreateUrlProps } from '../../types'
import type { OnRamperGatewaysResponse } from './types'
import {
  findAssetIdByOnramperCrypto,
  findOnramperTokenIdByAssetId,
  getSupportedOnramperCurrencies,
} from './utils'

import { getConfig } from '@/config'

export const getOnRamperAssets = async (): Promise<AssetId[]> => {
  const data = await getSupportedOnramperCurrencies()
  if (!data) return []
  return convertOnRamperDataToFiatRampAsset(data)
}

const convertOnRamperDataToFiatRampAsset = (response: OnRamperGatewaysResponse): AssetId[] => {
  return Array.from(
    new Set(
      response.message.crypto
        .map(currency => findAssetIdByOnramperCrypto(currency))
        .filter((assetId): assetId is AssetId => Boolean(assetId)),
    ),
  )
}

const generateSignature = async (data: string): Promise<string> => {
  const secretKey = getConfig().VITE_ONRAMPER_SIGNING_KEY
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const message = encoder.encode(data)

  // https://gist.github.com/fire015/73de05647cb3c3d5d0400d5286e5be50
  // Browser equivalent of crypto.createHmac since the browser crypto API is slightly diff from Node's
  // See https://developer.mozilla.org/en-US/docs/Web/API/Crypto vs. https://nodejs.org/api/crypto.html
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message)

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const createOnRamperUrl = async ({
  action,
  assetId,
  cryptoAmount,
  address,
  fiatCurrency,
  fiatAmount,
  options: { language, mode, currentUrl },
}: CreateUrlProps): Promise<string> => {
  const supportedCurrencies = await getSupportedOnramperCurrencies()
  if (!supportedCurrencies) throw new Error('Failed to get supported currencies from Onramper')

  const onRamperSymbols = (() => {
    const maybeMappingSymbols = adapters.assetIdToOnRamperTokenList(assetId)
    if (maybeMappingSymbols?.length) return maybeMappingSymbols

    const tokenId = findOnramperTokenIdByAssetId(assetId, supportedCurrencies)

    if (!tokenId) return

    return [tokenId]
  })()

  if (!onRamperSymbols?.length) {
    throw new Error('Asset not supported by OnRamper')
  }

  const baseUrl = getConfig().VITE_ONRAMPER_WIDGET_URL
  const apiKey = getConfig().VITE_ONRAMPER_API_KEY

  const params = new URLSearchParams()
  const defaultCrypto = head(onRamperSymbols)

  // This should not happen really, head() is just strongly typed in favour of safety but we should have at least one symbol really
  // Unless we don't? I mean that's what safety is for, hey
  if (!defaultCrypto) throw new Error('Failed to get onRamperSymbols head')

  params.set('apiKey', apiKey)
  params.set('wallets', `${defaultCrypto}:${address}`)

  if (action === FiatRampAction.Sell) {
    // Note: selling via OnRamper does not allow selecting the currency, their api currently does not support it
    params.set('mode', 'sell')
    params.set('sell_defaultCrypto', defaultCrypto)
    params.set('sell_defaultFiat', fiatCurrency)
    params.set('sell_onlyCryptos', onRamperSymbols.join(','))

    if (cryptoAmount) {
      params.set('sell_defaultAmount', cryptoAmount)
    }
  } else {
    params.set('mode', 'buy')
    params.set('defaultCrypto', defaultCrypto)
    params.set('onlyCryptos', onRamperSymbols.join(','))
    params.set('defaultFiat', fiatCurrency)

    if (fiatAmount) {
      params.set('defaultAmount', fiatAmount)
    }
  }
  params.set('language', language)

  params.set('themeName', mode === 'dark' ? 'dark' : 'light')
  currentUrl && params.set('redirectURL', currentUrl)

  const walletParam = `wallets=${defaultCrypto}:${address}`
  const signature = await generateSignature(walletParam)
  params.set('signature', signature)

  const signedUrl = `${baseUrl.toString()}?${params.toString()}`

  return signedUrl
}
