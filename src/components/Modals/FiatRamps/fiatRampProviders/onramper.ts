import { currencyEquals } from '@uniswap/sdk'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'
import * as _ from 'lodash'

import { FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'MtPelerin'],
})


interface OnRamperGatewaysResponse {
  gateways: IGatewayItem[];
  localization: {
    country: string;
    state: string | null;
    currency: string;
  };
  icons: {
    [key: string]: IconGatewaysResponse;
  };
  defaultAmounts?: {
    [key: string]: number;
  };
}

interface Currency {
  code: string; // display only
  id: string; // internal id e.g. bnb-bep20
  precision: number;
  network?: string;
  displayName?: string;
  supportsAddressTag?: boolean;
}

interface IconGatewaysResponse {
  name: string;
  icon: string;
  symbol?: string;
}

interface IGatewayItem {
  identifier: string;
  paymentMethods: string[];
  fiatCurrencies: Currency[];
  cryptoCurrencies: Currency[];
}

export enum SelectGatewayByType {
  Performance = "performance",
  Price = "price",
  NotSuggested = "notSuggested",
}

export type {
  OnRamperGatewaysResponse as GatewaysResponse,
  IconGatewaysResponse,
  IGatewayItem,
  Currency,
};


export async function getOnRamperAssets(): Promise<FiatRampAsset[]> {
  const data = await (async () => {
    try {
      const baseUrl = getConfig().REACT_APP_ONRAMPER_URL
      const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY
      const { data } = await axios.get<OnRamperGatewaysResponse>(`${baseUrl}gateways?includeIcons=true`, {
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      })
      
      return data
    } catch (e) {
      moduleLogger.error(e, 'Failed to fetch assets')
    }
  })()

  if (!data) return []
  moduleLogger.info({data}, 'data')
  const fiatRampAssets = convertOnRamperDataToFiatRampAsset(data)
  moduleLogger.info({fiatRampAssets}, 'fiatdata')
  return fiatRampAssets
}

function convertOnRamperDataToFiatRampAsset(response: OnRamperGatewaysResponse): FiatRampAsset[]{
  const data = response.gateways.flatMap(gateway => gateway.cryptoCurrencies.map((curr => {
    return {
      code: curr.code,
      name: curr.displayName,
      assetId: curr.code,
      symbol: curr.code,
      imageUrl: response.icons[curr.code].icon
    } as FiatRampAsset
  })))
  return _.uniqBy(data, 'code')
}