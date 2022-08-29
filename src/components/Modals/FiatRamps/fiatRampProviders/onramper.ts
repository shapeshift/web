import axios from 'axios'
import { getConfig } from 'config'
import * as _ from 'lodash'
import { logger } from 'lib/logger'

import { FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'OnRamper'],
})

interface OnRamperGatewaysResponse {
  gateways: IGatewayItem[]
  localization: {
    country: string
    state: string | null
    currency: string
  }
  icons: IGL
  defaultAmounts?: {
    [key: string]: number
  }
}

type IGL = {
  [key: string]: IconGatewaysResponse
}

interface Currency {
  code: string // display only
  id: string // internal id e.g. bnb-bep20
  precision: number
  network?: string
  displayName?: string
  supportsAddressTag?: boolean
}

interface IconGatewaysResponse {
  name: string
  icon: string
  symbol?: string
}

interface IGatewayItem {
  identifier: string
  paymentMethods: string[]
  fiatCurrencies: Currency[]
  cryptoCurrencies: Currency[]
}

export async function getOnRamperAssets(): Promise<FiatRampAsset[]> {
  const data = await (async () => {
    try {
      const baseUrl = getConfig().REACT_APP_ONRAMPER_URL
      const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY
      const { data } = await axios.get<OnRamperGatewaysResponse>(
        `${baseUrl}gateways?includeIcons=true`,
        {
          headers: {
            Authorization: `Basic ${apiKey}`,
          },
        },
      )

      return data
    } catch (e) {
      moduleLogger.error(e, 'Failed to fetch assets')
    }
  })()

  if (!data) return []
  const fiatRampAssets = convertOnRamperDataToFiatRampAsset(data)
  return fiatRampAssets
}

function convertOnRamperDataToFiatRampAsset(response: OnRamperGatewaysResponse): FiatRampAsset[] {
  // First get all the Transak coins, since they have the cleanest names
  // Then add all the rest
  const groupedByGateway = _.groupBy(response.gateways, 'identifier')
  const initialCoins =
    _.head(groupedByGateway['Transak'])?.cryptoCurrencies.map(currency =>
      toFiatRampAsset(currency, response.icons),
    ) || []

  const initialCoinsUnique = _.uniqBy(initialCoins, 'assetId')

  const coinsWithDisplayName = response.gateways
    .flatMap(gw => gw.cryptoCurrencies)
    .filter(coin => coin.displayName !== undefined)

  const totalCoinList = coinsWithDisplayName.reduce<FiatRampAsset[]>((acc, curr) => {
    if (!acc.find(coin => coin.assetId === curr.code)) {
      acc.push({
        name: curr.displayName || '',
        assetId: curr.code,
        symbol: curr.code,
        imageUrl: response.icons[curr.code].icon,
        disabled: false,
      })
    }
    return acc
  }, initialCoinsUnique)
  return totalCoinList
}

function toFiatRampAsset(currency: Currency, icons: IGL) {
  return {
    name: currency.displayName,
    assetId: currency.code,
    symbol: currency.code,
    imageUrl: icons[currency.code].icon,
    disabled: false,
  } as FiatRampAsset
}
