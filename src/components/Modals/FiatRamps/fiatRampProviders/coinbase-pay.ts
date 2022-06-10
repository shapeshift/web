import { AssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import toLower from 'lodash/toLower'
import { logger } from 'lib/logger'

import { FiatRampAsset } from '../FiatRampsCommon'

type CoinbaseCurrency = {
  id: string
  name: string
  min_size: string
  status: string
  message: string
  max_precision: string
  convertible_to: string[]
  details: {
    type: 'fiat' | 'crypto'
    symbol: string | null
    network_confirmations: number | null
    sort_order: number
    crypto_address_link: string | null
    crypto_transaction_link: string | null
    push_payment_methods: string[]
    group_types: string[]
    display_name: string | null
    processing_time_seconds: string | null
    min_withdrawal_amount: number | null
    max_withdrawal_amount: number | null
  }
  default_network: string
  supported_networks: string[]
}

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'coinbase-pay'],
})

export async function getCoinbasePayAssets(): Promise<FiatRampAsset[]> {
  try {
    const { data } = await axios.get<CoinbaseCurrency[]>(
      getConfig().REACT_APP_COINBASE_SUPPORTED_COINS,
    )
    const supportedBlockchains = ['bitcoin', 'ethereum', 'cosmos']
    const fiatRampAssets = data.reduce<FiatRampAsset[]>((acc, curr) => {
      if (curr.details.type !== 'crypto') return acc
      if (!supportedBlockchains.includes(curr.default_network)) return acc
      const assetId = coinbaseCurrencyToAssetId(curr)
      if (!assetId) return acc
      acc.push({
        name: curr.name,
        assetId,
        symbol: curr.id,
        fiatRampCoinId: curr.id,
      })
      return acc
    }, [])
    return fiatRampAssets
  } catch (err) {
    moduleLogger.error(
      err,
      { fn: 'getCoinbasePayAssets' },
      'Get supported coins (coinbase-pay) failed',
    )
    return []
  }
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
  moduleLogger.info(`Could not create assetId from coinbase asset ${currency.id}`)
  return null
}
