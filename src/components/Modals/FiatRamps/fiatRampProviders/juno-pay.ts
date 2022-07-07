import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { logger } from 'lib/logger'

import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'fiatRampProviders', 'JunoPay'],
})

export async function getJunoPayAssets(): Promise<FiatRampAsset[]> {
  try {
    const junoPayData  = await axios.get(getConfig().REACT_APP_JUNOPAY_SUPPORTED_COINS)
    
    let junoPayToCurrencyList= junoPayData.data.data.settings.buy.to_currency
    
    let junoPayCurrencyList = junoPayToCurrencyList.map((item: any) => {
      return item;
    });
    let allCurrencyList = junoPayData.data.data.settings.metadata 
    
    const junoPayAssets = allCurrencyList.filter((item: { short_name: string }) => junoPayCurrencyList.includes(item.short_name.toUpperCase()));
    
    const assets: FiatRampAsset[] = junoPayAssets.map((asset: { long_name: string; short_name: string; logo_url: string; }) => ({
      assetId: adapters.junopayTickerToAssetId(asset.short_name),
      symbol: asset.short_name.toUpperCase(),
      name: asset.long_name,
      imageUrl: asset.logo_url
    }))
    
    return assets
  } catch (err) {
    moduleLogger.error(
      err,
      { fn: 'getJunoPayAssets' },
      'Get supported coins (JunoPay) failed',
    )
    return []
  }
}

export const createJunoPayUrl = (action: FiatRampAction, asset: string, address: string): string => {
  const JUNOPAY_BASE_URL = new URL('https://juno.finance/partners/shapeshift')

  const params = new URLSearchParams()
  
  params.set('action', action === FiatRampAction.Sell ? 'sell' : 'buy')
  params.set('currency', asset && asset.toLowerCase())
  params.set('partnerKey', 'live_SYkQkrlyIQeuQf8AauSOaGTa')
  params.set('name', 'shapeshift')
  params.set('walletAddress', address)

  return `${JUNOPAY_BASE_URL.toString()}?${params.toString()}`
}