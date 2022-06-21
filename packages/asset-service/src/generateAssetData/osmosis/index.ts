import { ASSET_REFERENCE, osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import axios from 'axios'

import { getRenderedIdenticonBase64, IdenticonOptions } from '../../service/GenerateAssetIcon'
import { osmosis } from '../baseAssets'

type OsmoAsset = {
  description: string
  denom_units: {
    denom: string
    exponent: number
    aliases: string[]
  }[]
  base: string
  name: string
  display: string
  symbol: string
  logo_URIs: {
    png: string
    svg: string
  }
  coingecko_id: string
  ibc?: {
    source_channel: string
    dst_channel: string
    source_denom: string
  }
}

type OsmosisAssetList = {
  chain_id: string
  assets: OsmoAsset[]
}

export const getAssets = async (): Promise<Asset[]> => {
  const { data } = await axios.get<OsmosisAssetList>(
    'https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json'
  )

  return data.assets.reduce<Asset[]>((acc, current) => {
    if (!current) return acc

    const denom = current.denom_units.find((item) => item.denom === current.display)
    const precision = denom?.exponent ?? 6

    const { assetNamespace, assetReference } = (() => {
      if (current.base.startsWith('u') && current.base !== 'uosmo') {
        return { assetNamespace: 'native' as const, assetReference: current.base }
      }

      if (current.base.startsWith('ibc')) {
        return { assetNamespace: 'ibc' as const, assetReference: current.base.split('/')[1] }
      }

      return { assetNamespace: 'slip44' as const, assetReference: ASSET_REFERENCE.Osmosis }
    })()

    // if an asset has an ibc object, it's bridged, so label it as e.g. ATOM on Osmosis
    const getName = (a: OsmoAsset): string => (a.ibc ? `${a.name} on Osmosis` : a.name)

    const assetDatum: Asset = {
      assetId: toAssetId({ chainId: osmosisChainId, assetNamespace, assetReference }),
      chainId: osmosisChainId,
      symbol: current.symbol,
      name: getName(current),
      precision,
      color: '#FFFFFF',
      icon: current.logo_URIs.png,
      explorer: osmosis.explorer,
      explorerAddressLink: osmosis.explorerAddressLink,
      explorerTxLink: osmosis.explorerTxLink
    }

    if (!assetDatum.icon) {
      const options: IdenticonOptions = {
        identiconImage: {
          size: 128,
          background: [45, 55, 72, 255]
        },
        identiconText: {
          symbolScale: 7,
          enableShadow: true
        }
      }
      assetDatum.icon = getRenderedIdenticonBase64(
        assetDatum.assetId,
        assetDatum.symbol.substring(0, 3),
        options
      )
    }

    acc.push(assetDatum)
    return acc
  }, [])
}
