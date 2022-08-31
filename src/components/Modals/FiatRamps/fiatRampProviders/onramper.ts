import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { groupBy, head, uniqBy } from 'lodash'
import { logger } from 'lib/logger'

import { FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'OnRamper'],
})

// Non-exhaustive required types definition. Full reference: https://github.com/onramper/widget/blob/master/package/src/ApiContext/api/types/gateways.ts
interface OnRamperGatewaysResponse {
  gateways: IGatewayItem[]
  icons: TokenIconMap
}

type TokenIconMap = {
  [key: string]: IconGatewaysResponse
}

interface Currency {
  code: string
  id: string
  network?: string
  displayName?: string
}

interface IconGatewaysResponse {
  name: string
  icon: string
  symbol?: string
}

interface IGatewayItem {
  identifier: string
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
  // We only need Transak coin definitions, they have the cleanest naming scheme out of all available providers
  const groupedByGateway = groupBy(response.gateways, 'identifier')
  const initialCoins = head(groupedByGateway['Transak'])
    ?.cryptoCurrencies.map(currency => toFiatRampAsset(currency, response.icons))
    .filter(p => p !== undefined) as FiatRampAsset[]

  const uniqueCoins = uniqBy(initialCoins, 'assetId')
  return uniqueCoins
}

function toFiatRampAsset(currency: Currency, icons: TokenIconMap): FiatRampAsset | undefined {
  const assetId = adapters.onRamperTickerToAssetId(currency.code)
  if (assetId !== undefined) {
    return {
      name: currency.displayName || '',
      assetId,
      symbol: currency.code,
      imageUrl: icons[currency.code].icon,
    }
  }
  return undefined
}
