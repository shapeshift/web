import { cosmosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { atom } from '@shapeshiftoss/utils/src/assetData/baseAssets'
import axios from 'axios'

import colormap from '../color-map.json'

export const colorMap: Record<string, string> = colormap

type CosmosAsset = {
  type: string
  denom: string
  name: string
  symbol: string
  description: string
  decimals: number
  image: string
  coinGeckoId: string
  ibc_info: {
    path: string
    client: {
      channel: string
      port: string
    }
    counterparty: {
      channel: string
      port: string
      chain: string
      denom: string
    }
  }
}

export const getAssets = async (): Promise<Asset[]> => {
  /* Fetch asset list */
  const { data: assetData } = await axios.get<CosmosAsset[]>(
    'https://rawcdn.githack.com/cosmostation/chainlist/main/chain/cosmos/assets_2.json',
  )

  if (!assetData) throw new Error('Could not get Cosmos asset data!')

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
      icon: current.image,
      explorer: atom.explorer,
      explorerAddressLink: atom.explorerAddressLink,
      explorerTxLink: atom.explorerTxLink,
      relatedAssetKey: null,
    }

    acc.push(assetDatum)

    return acc
  }, [])
}
