import { ASSET_REFERENCE, osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import type { Asset } from 'lib/asset-service'

import { osmosis } from '../baseAssets'
import { colorMap } from '../colorMap'
import type { IdenticonOptions } from '../generateAssetIcon/generateAssetIcon'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'

const OSMOSIS_LP_ASSET_PRECISION = 18

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
  traces: {
    type: string
    counterparty: {
      chain_name: string
      base_denom: string
      channel_id: string
    }
    chain: {
      channel_id: string
    }
  }[]
  logo_URIs: {
    png?: string
    svg?: string
  }
  coingecko_id: string
  keywords: string[]
}

type OsmosisAssetList = {
  chain_name: string
  assets: OsmoAsset[]
}

export const getAssets = async (): Promise<Asset[]> => {
  /* Fetch asset list */

  const { data: assetData } = await axios.get<OsmosisAssetList>(
    `https://rawcdn.githack.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json`,
  )

  if (!assetData) throw new Error('Could not get Osmosis asset data!')

  /* Osmosis pool IDs are guaranteed to be unique integers, so we use a set to keep track of 
    which pools we've already seen. A lookup is necessary because the Osmosis asset list 
    contains duplicate entries for each pool, eg. ATOM/OSMO == OSMO/ATOM. 
  */
  const lpAssetsAdded = new Set()

  return assetData.assets.reduce<Promise<Asset[]>>(async (accPrevious, current) => {
    const acc = await accPrevious
    if (!current) return acc

    if (current.base.startsWith('factory')) {
      return acc
    }

    const denom = current.denom_units.find(item => item.denom === current.display)
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
    const getAssetName = (a: OsmoAsset): string =>
      a.base.startsWith('ibc') ? `${a.name} on Osmosis` : a.name

    const assetId = `cosmos:osmosis-1/${assetNamespace}:${assetReference}`

    const logoURI = (current.logo_URIs.png ?? current.logo_URIs.svg ?? '').replace(
      'raw.githubusercontent.com',
      'rawcdn.githack.com',
    )

    const assetDatum: Asset = {
      assetId,
      chainId: osmosisChainId,
      symbol: current.symbol,
      name: getAssetName(current),
      precision,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: logoURI,
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

    /* If liquidity pools are available for asset, generate assets representing LP tokens for each pool available. */

    const getLPTokenName = (asset1: string, asset2: string): string =>
      `Osmosis ${asset1}/${asset2} LP Token`

    /** Helper function to make sure that a given keyword is a valid pool entry.
     * Pool entries are of the form "<symbol:string>:<pool_id:number>".
     */
    const keywordReducer = (
      keywords: { pairedSymbol: string; poolId: string }[],
      currentKeyword: string,
    ): { pairedSymbol: string; poolId: string }[] => {
      /* https://bobbyhadz.com/blog/typescript-check-if-string-is-valid-number */
      const isNumeric = (s: string) => {
        if (typeof s !== 'string') return false
        if (s.trim() === '') return false
        return !Number.isNaN(Number(s))
      }

      if (currentKeyword.includes(':')) {
        const substrings = currentKeyword.split(':')
        if (substrings.length === 2 && isNumeric(substrings[1])) {
          keywords.push({
            pairedSymbol: substrings[0],
            poolId: substrings[1],
          })
        }
      }
      return keywords
    }

    /** The new osmosis.zone.json file doesn't contain both symbol names for the underlying assets in the liquidity pools.
     * For now, the Osmosis pool data can be parsed from the keywords array in the assetlist.json entries.
     * This might become unreliable later if the schema changes again, but for now this works and is better than making
     * several API calls for each entry.
     *
     * https://github.com/osmosis-labs/assetlists/blob/main/osmosis-1/osmosis.zone.json
     * https://raw.githack.com/osmosis-labs/assetlists/676c665f8c8c661d199402dfb18514a7f57faccf/osmosis-1/osmosis-1.assetlist.json
     * */

    if (current.keywords) {
      for (const { pairedSymbol, poolId } of current.keywords.reduce(keywordReducer, [])) {
        if (lpAssetsAdded.has(poolId)) continue

        const lpAssetDatum: Asset = {
          assetId: toAssetId({
            chainId: osmosisChainId,
            assetNamespace: 'ibc',
            assetReference: `gamm/pool/${poolId}`,
          }),
          chainId: osmosisChainId,
          symbol: `gamm/pool/${poolId}`,
          name: getLPTokenName(current.symbol, pairedSymbol),
          precision: OSMOSIS_LP_ASSET_PRECISION,
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
  }, Promise.resolve([]))
}
