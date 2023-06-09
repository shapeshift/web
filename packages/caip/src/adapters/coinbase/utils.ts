import axios from 'axios'
import fs from 'fs'
import toLower from 'lodash/toLower'

import type { AssetId } from '../../index'

type CoinbaseCurrency = {
  id: string
  details: {
    crypto_address_link: string | null
  }
  default_network: string
}

function coinbaseCurrencyToAssetId(currency: CoinbaseCurrency): AssetId | null {
  if (currency.id === 'BTC') return 'bip122:000000000019d6689c085ae165831e93/slip44:0'
  if (currency.id === 'ATOM') return 'cosmos:cosmoshub-4/slip44:118'
  if (currency.id === 'OSMO') return 'cosmos:osmosis-1/slip44:118'
  if (currency.id === 'ETH') return 'eip155:1/slip44:60'
  if (currency.default_network === 'ethereum') {
    const addressQuery = currency.details.crypto_address_link?.split('token/')[1]
    const address = addressQuery?.split('?a')[0]
    return `eip155:1/erc20:${toLower(address)}`
  }
  console.info(`Could not create assetId from coinbase asset ${currency.id}`)
  return null
}

export function parseData(data: CoinbaseCurrency[]): Record<AssetId, string> {
  return data.reduce<Record<AssetId, string>>(
    (acc: Record<AssetId, string>, current: CoinbaseCurrency) => {
      const assetId = coinbaseCurrencyToAssetId(current)
      if (!assetId) return acc
      acc[assetId] = current.id
      return acc
    },
    {},
  )
}

export async function getData(): Promise<CoinbaseCurrency[]> {
  try {
    const { data } = await axios.get<CoinbaseCurrency[]>('https://api.pro.coinbase.com/currencies')
    return data
  } catch (err) {
    console.error('Get supported coins (coinbase-pay) failed')
    return []
  }
}

const writeFile = async (data: Record<AssetId, string>) => {
  const path = './src/adapters/coinbase/generated/'
  const file = 'adapter.json'
  await fs.promises.writeFile(`${path}${file}`, JSON.stringify(data, null, 2))
}

export const writeFiles = async (data: Record<AssetId, string>) => {
  await writeFile(data)
  console.info('Generated Coinbase AssetId adapter data.')
}
