import axios from 'axios'
import fs from 'fs'

import type { AssetNamespace, AssetReference } from '../../assetId/assetId'
import { toAssetId } from '../../assetId/assetId'
import { toChainId } from '../../chainId/chainId'
import { ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'

export type OsmosisCoin = {
  price: number
  denom: string
  symbol: string
  liquidity: number
  liquidity_24h_change: number
  volume_24h: number
  volume_24h_change: number
  name: string
  price_24h_change: number
}

export type OsmosisPool = {
  symbol: string
  amount: number
  denom: string
  coingecko_id: string
  liquidity: number
  liquidity_24h_change: number
  volume_24h: number
  volume_24h_change: number
  volume_7d: number
  price: number
  fees: string
  main: boolean
}

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/osmosis/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated Osmosis AssetId adapter data.')
}

export const fetchData = async ({
  tokensUrl,
  lpTokensUrl,
}: {
  tokensUrl: string
  lpTokensUrl: string
}): Promise<OsmosisCoin[]> => {
  const tokens = (await axios.get<OsmosisCoin[]>(tokensUrl)).data
  const lpTokenData = (await axios.get<{ [key: string]: OsmosisPool[] }>(lpTokensUrl)).data

  const lpTokens = Object.entries(lpTokenData).reduce<OsmosisCoin[]>((acc, current) => {
    if (!current) return acc

    const [poolId, tokenPair] = current

    const coin: OsmosisCoin = {
      price: 0,
      denom: `gamm/pool/${poolId}`,
      symbol: `gamm/pool/${poolId}`,
      liquidity: tokenPair[0].liquidity,
      liquidity_24h_change: tokenPair[0].liquidity_24h_change,
      volume_24h: tokenPair[0].volume_24h,
      volume_24h_change: tokenPair[0].volume_24h_change,
      name: `Osmosis ${tokenPair[0].symbol}/${tokenPair[1].symbol} LP Token`,
      price_24h_change: 0,
    }
    acc.push(coin)
    return acc
  }, [])

  return [...lpTokens, ...tokens]
}

export const parseOsmosisData = (data: OsmosisCoin[]) => {
  const results = data.reduce((acc, { denom, symbol }) => {
    // denoms for non native assets are formatted like so: 'ibc/27394...'
    const isNativeAsset = !denom.split('/')[1]
    const isLpToken = denom.startsWith('gamm/pool/')
    const isOsmo = denom === 'uosmo'

    let assetNamespace: AssetNamespace
    let assetReference

    if (isNativeAsset) {
      assetReference = isOsmo ? ASSET_REFERENCE.Osmosis : denom
      assetNamespace = isOsmo ? 'slip44' : 'native'
    } else {
      assetReference = isLpToken ? denom : denom.split('/')[1]
      assetNamespace = 'ibc'
    }

    const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
    const chainReference = CHAIN_REFERENCE.OsmosisMainnet
    const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })

    acc[assetId] = symbol
    return acc
  }, {} as Record<string, string>)

  return results
}

export const parseData = (d: OsmosisCoin[]) => {
  const osmosisMainnet = toChainId({
    chainNamespace: CHAIN_NAMESPACE.CosmosSdk,
    chainReference: CHAIN_REFERENCE.OsmosisMainnet,
  })

  return {
    [osmosisMainnet]: parseOsmosisData(d),
  }
}

export const isOsmosisLpAsset = (assetReference: AssetReference | string): boolean => {
  return assetReference.startsWith('gamm/pool/')
}

export const isNumeric = (s: string): boolean => {
  if (typeof s !== 'string') return false
  if (s.trim() === '') return false
  return !Number.isNaN(Number(s))
}
