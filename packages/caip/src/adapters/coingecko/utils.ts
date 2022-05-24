import axios from 'axios'
import fs from 'fs'

import { toAssetId } from '../../assetId/assetId'
import {
  ASSET_REFERENCE,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosChainId,
  ethChainId,
  osmosisChainId
} from '../../constants'
import { makeBtcData, makeCosmosHubData, makeOsmosisData } from '../../utils'

export type CoingeckoCoin = {
  id: string
  symbol: string
  name: string
  platforms: {
    [k: string]: string
  }
}

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/coingecko/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated CoinGecko AssetId adapter data.')
}

export const fetchData = async (URL: string) => (await axios.get<CoingeckoCoin[]>(URL)).data

export const parseEthData = (data: CoingeckoCoin[]) => {
  const ethCoins = data.filter(
    ({ id, platforms }) => Boolean(platforms?.ethereum) || id === 'ethereum'
  )

  const chainNamespace = CHAIN_NAMESPACE.Ethereum
  const chainReference = CHAIN_REFERENCE.EthereumMainnet

  return ethCoins.reduce((acc, { id, platforms }) => {
    const assetNamespace = id === 'ethereum' ? 'slip44' : 'erc20'
    const assetReference = id === 'ethereum' ? ASSET_REFERENCE.Ethereum : platforms?.ethereum
    const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
    acc[assetId] = id
    return acc
  }, {} as Record<string, string>)
}

export const parseData = (d: CoingeckoCoin[]) => {
  return {
    [ethChainId]: parseEthData(d),
    [btcChainId]: makeBtcData(),
    [cosmosChainId]: makeCosmosHubData(),
    [osmosisChainId]: makeOsmosisData()
  }
}
