import type { AssetId } from '@keepkey/caip'
import { adapters } from '@keepkey/caip'
import axios from 'axios'
import { getConfig } from 'config'
import head from 'lodash/head'
import uniqBy from 'lodash/uniqBy'
import { logger } from 'lib/logger'

import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'OnRamper'],
})

// Non-exhaustive required types definition. Full reference: https://github.com/onramper/widget/blob/master/package/src/ApiContext/api/types/gateways.ts
type OnRamperGatewaysResponse = {
  gateways: GatewayItem[]
  icons: TokenIconMap
}

type TokenIconMap = {
  [key: string]: IconGatewaysResponse
}

type Currency = {
  code: string
  id: string
  network?: string
  displayName?: string
}

type IconGatewaysResponse = {
  name: string
  icon: string
  symbol?: string
}

type GatewayItem = {
  identifier: string
  cryptoCurrencies: Currency[]
}

const getGatewayData = async () => {
  try {
    const baseUrl = getConfig().REACT_APP_ONRAMPER_API_URL
    const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY
    return (
      await axios.get<OnRamperGatewaysResponse>(`${baseUrl}gateways?includeIcons=true`, {
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      })
    ).data
  } catch (e) {
    moduleLogger.error(e, 'Failed to fetch assets')
  }
}

export const getOnRamperAssets = async (): Promise<FiatRampAsset[]> => {
  const data = await getGatewayData()
  if (!data) return []
  return convertOnRamperDataToFiatRampAsset(data)
}

const convertOnRamperDataToFiatRampAsset = (
  response: OnRamperGatewaysResponse,
): FiatRampAsset[] => {
  const allCoins = response.gateways
    .flatMap(gateway => gateway.cryptoCurrencies)
    .map(currency => toFiatRampAsset(currency, response.icons))
    .filter((a): a is FiatRampAsset => a !== undefined)

  const uniqueCoins = uniqBy(allCoins, 'assetId')
  return uniqueCoins
}

const toFiatRampAsset = (currency: Currency, icons: TokenIconMap): FiatRampAsset | undefined => {
  const assetId = adapters.onRamperTokenIdToAssetId(currency.code)
  if (assetId) {
    return {
      name: currency.displayName ?? '',
      assetId,
      symbol: currency.code,
      imageUrl: icons[currency.code].icon,
      fiatRampCoinId: currency.id,
    }
  }
  return undefined
}

export const createOnRamperUrl = (
  action: FiatRampAction,
  assetId: AssetId,
  address: string,
  currentUrl: string,
): string => {
  const onRamperSymbols = adapters.assetIdToOnRamperTokenList(assetId)
  if (!onRamperSymbols) throw new Error('Asset not supported by OnRamper')

  const baseUrl = getConfig().REACT_APP_ONRAMPER_WIDGET_URL
  const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY

  const params = new URLSearchParams()
  const defaultCrypto = head(onRamperSymbols)!!

  params.set('apiKey', apiKey)
  params.set('defaultCrypto', defaultCrypto)
  params.set('wallets', `${defaultCrypto}:${address}`)

  if (action === FiatRampAction.Sell) {
    // Note: selling via OnRamper does not allow selecting the currency, their api currently does not support it
    params.set('initScreen', 'sell')
    params.set('supportSell', 'true')
    params.set('isAddressEditable', 'true')
  } else {
    params.set('onlyCryptos', onRamperSymbols.join(','))
    params.set('supportSell', 'false')
    params.set('isAddressEditable', 'false')
  }

  params.set('darkMode', 'true')
  params.set('redirectURL', currentUrl)

  return `${baseUrl.toString()}?${params.toString()}`
}
