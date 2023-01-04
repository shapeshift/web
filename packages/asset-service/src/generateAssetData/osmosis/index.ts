import { ASSET_REFERENCE, osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'

import { Asset } from '../../service/AssetService'
import { getRenderedIdenticonBase64, IdenticonOptions } from '../../service/GenerateAssetIcon'
import { osmosis } from '../baseAssets'
import { colorMap } from '../colorMap'

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
  pools?: {
    [key: string]: number
  }
}

type OsmosisAssetList = {
  chain_id: string
  assets: OsmoAsset[]
}

export const getAssets = async (): Promise<Asset[]> => {
  const { data: assetData } = await axios.get<OsmosisAssetList>(
    'https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json',
  )

  /* Osmosis pool IDs are guaranteed to be unique integers, so we use a set to keep track of 
    which pools we've already seen. A lookup is necessary because the Osmosis asset list 
    contains duplicate entries for each pool, eg. ATOM/OSMO == OSMO/ATOM. 
  */
  const lpAssetsAdded = new Set()

  return assetData.assets.reduce<Asset[]>((acc, current) => {
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
    const getAssetName = (a: OsmoAsset): string => (a.ibc ? `${a.name} on Osmosis` : a.name)

    const assetId = `cosmos:osmosis-1/${assetNamespace}:${assetReference}`

    const assetDatum: Asset = {
      assetId,
      chainId: osmosisChainId,
      symbol: current.symbol,
      name: getAssetName(current),
      precision,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: current.logo_URIs.png,
      explorer: osmosis.explorer,
      explorerAddressLink: osmosis.explorerAddressLink,
      explorerTxLink: osmosis.explorerTxLink,
    }

    if (!assetDatum.icon) {
      const options: IdenticonOptions = {
        identiconImage: {
          size: 128,
          background: [45, 55, 72, 255],
        },
        identiconText: {
          symbolScale: 7,
          enableShadow: true,
        },
      }
      assetDatum.icon = getRenderedIdenticonBase64(
        assetDatum.assetId,
        assetDatum.symbol.substring(0, 3),
        options,
      )
    }
    acc.push(assetDatum)

    // If liquidity pools are available for asset, generate assets representing LP tokens for each pool available.

    const getLPTokenName = (asset1: string, asset2: string): string =>
      `Osmosis ${asset1}/${asset2} LP Token`

    if (current.pools) {
      for (const [pairedToken, poolId] of Object.entries(current.pools)) {
        if (lpAssetsAdded.has(poolId)) continue

        const lpAssetDatum: Asset = {
          assetId: toAssetId({
            chainId: osmosisChainId,
            assetNamespace: 'ibc',
            assetReference: `gamm/pool/${poolId}`,
          }),
          chainId: osmosisChainId,
          symbol: `gamm/pool/${poolId}`,
          name: getLPTokenName(current.symbol, pairedToken),
          precision: osmosis.precision,
          color: osmosis.color,
          icon: osmosis.icon,
          explorer: osmosis.explorer,
          explorerAddressLink: osmosis.explorerAddressLink,
          explorerTxLink: osmosis.explorerTxLink,
        }
        acc.push(lpAssetDatum)
        lpAssetsAdded.add(poolId)
      }
    }

    return acc
  }, [])
}
