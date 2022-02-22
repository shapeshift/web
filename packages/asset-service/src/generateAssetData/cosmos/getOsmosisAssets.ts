import { Asset, AssetDataSource, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import axios from 'axios'

type AssetList = {
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
}

type OsmosisAssetList = {
  chain_id: string
  assets: AssetList[]
}

export const getOsmosisAssets = async (): Promise<Asset[]> => {
  const { data } = await axios.get<OsmosisAssetList>(
    'https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json'
  )

  return data.assets.reduce<Asset[]>((acc, current) => {
    if (!current) return acc

    const denom = current.denom_units.find((item) => item.denom === current.display)
    const precision = denom?.exponent ?? 6

    let assetNamespace = 'slip44:118'
    let assetReference = '118'

    if (current.base.startsWith('u') && current.base !== 'uosmo') {
      assetNamespace = 'native'
      assetReference = current.base
    } else if (current.base.startsWith('ibc')) {
      assetNamespace = 'ibc'
      assetReference = current.base.split('/')[1]
    }

    acc.push({
      caip19: `cosmos:osmosis-1/${assetNamespace}:${assetReference}`,
      caip2: 'cosmos:osmosis-1',
      chain: ChainTypes.Cosmos,
      dataSource: AssetDataSource.CoinGecko,
      network: NetworkTypes.OSMOSIS_MAINNET,
      symbol: current.symbol,
      name: current.name,
      precision,
      slip44: 60,
      color: '#FFFFFF',
      secondaryColor: '#FFFFFF',
      icon: current.logo_URIs.png,
      explorer: 'https://mintscan.io',
      explorerAddressLink: 'https://mintscan.io/cosmos/account',
      explorerTxLink: 'https://mintscan.io/cosmos/txs/',
      sendSupport: true,
      receiveSupport: true
    })
    return acc
  }, [])
}
