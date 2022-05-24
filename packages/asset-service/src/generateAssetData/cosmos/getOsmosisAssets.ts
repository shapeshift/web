import { Asset, AssetDataSource, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import axios from 'axios'

import { getRenderedIdenticonBase64, IdenticonOptions } from '../../service/GenerateAssetIcon'

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

export const getOsmosisAssets = async (): Promise<Asset[]> => {
  const { data } = await axios.get<OsmosisAssetList>(
    'https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json'
  )

  return data.assets.reduce<Asset[]>((acc, current) => {
    if (!current) return acc

    const denom = current.denom_units.find((item) => item.denom === current.display)
    const precision = denom?.exponent ?? 6

    let assetNamespace = 'slip44'
    let assetReference = '118'

    if (current.base.startsWith('u') && current.base !== 'uosmo') {
      assetNamespace = 'native'
      assetReference = current.base
    } else if (current.base.startsWith('ibc')) {
      assetNamespace = 'ibc'
      assetReference = current.base.split('/')[1]
    }

    // if an asset has an ibc object, it's bridged, so label it as e.g. ATOM on Osmosis
    const getName = (a: OsmoAsset): string => (a.ibc ? `${a.name} on Osmosis` : a.name)

    const assetDatum = {
      assetId: `cosmos:osmosis-1/${assetNamespace}:${assetReference}`,
      chainId: 'cosmos:osmosis-1',
      chain: ChainTypes.Osmosis,
      dataSource: AssetDataSource.CoinGecko,
      network: NetworkTypes.OSMOSIS_MAINNET,
      symbol: current.symbol,
      name: getName(current),
      precision,
      slip44: 60,
      color: '#FFFFFF',
      secondaryColor: '#FFFFFF',
      icon: current.logo_URIs.png,
      explorer: 'https://mintscan.io',
      explorerAddressLink: 'https://mintscan.io/osmosis/account/',
      explorerTxLink: 'https://mintscan.io/osmosis/txs/',
      sendSupport: true,
      receiveSupport: true
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
