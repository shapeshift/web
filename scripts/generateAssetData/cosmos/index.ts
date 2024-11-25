import { cosmosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { atom } from '../baseAssets'
import colormap from '../color-map.json'
import assets from './assets.json'

export const colorMap: Record<string, string> = colormap

type CosmosAsset = {
  denom: string
  type: string
  origin_chain: string
  origin_denom: string
  origin_type: string
  symbol: string
  decimals: number
  enable?: boolean
  path?: string
  channel?: string
  port?: string
  counter_party?: {
    channel: string
    port: string
    denom: string
  }
  description?: string
  image?: string
  coinGeckoId: string
}

export const getAssets = (): Asset[] => {
  /* 
  This doesn't fetch assets *anymore* but simply build them, as cosmostation/chainlist assets.json have been removed in https://github.com/cosmostation/chainlist/commit/4418f0404ccbebaf753c3e4d56d7906ad14e7d17
  We hardcoded the latest assets.json from the last commit before the removal of assets.json and use that to build Cosmos assets the same way as we used to 
  */

  const assetData = assets as CosmosAsset[]

  return assetData.reduce<Asset[]>((accPrevious, current) => {
    const acc = accPrevious
    if (!current) return acc

    const precision = current.decimals

    // IBC assets are all we are interested in here
    if (!current.denom.startsWith('ibc')) return acc
    const { assetNamespace, assetReference } = (() => {
      return { assetNamespace: 'ibc' as const, assetReference: current.denom.split('/')[1] }
    })()

    const getAssetName = (a: CosmosAsset): string =>
      a.denom.startsWith('ibc') ? `${a.symbol} on Cosmos` : a.symbol

    const assetId = `cosmos:cosmoshub-4/${assetNamespace}:${assetReference}`

    const assetDatum: Asset = {
      assetId,
      chainId: cosmosChainId,
      symbol: current.symbol,
      name: getAssetName(current),
      precision,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: current.image
        ? `https://raw.githubusercontent.com/cosmostation/chainlist/main/chain/${current.image}`
        : '',
      explorer: atom.explorer,
      explorerAddressLink: atom.explorerAddressLink,
      explorerTxLink: atom.explorerTxLink,
      relatedAssetKey: null,
    }

    acc.push(assetDatum)

    return acc
  }, [])
}
