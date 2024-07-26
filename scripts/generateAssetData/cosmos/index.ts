import { cosmosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'

import { atom } from '../baseAssets'
import { colorMap } from '../colorMap'

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

export const getAssets = async (): Promise<Asset[]> => {
  /* Fetch asset list */

  const { data: assetData } = await axios.get<CosmosAsset[]>(
    'https://rawcdn.githack.com/cosmostation/chainlist/main/chain/cosmos/assets.json',
  )

  if (!assetData) throw new Error('Could not get Cosmos asset data!')

  return assetData.reduce<Promise<Asset[]>>(async (accPrevious, current) => {
    const acc = await accPrevious
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
  }, Promise.resolve([]))
}
