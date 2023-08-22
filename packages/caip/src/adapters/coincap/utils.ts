import axios from 'axios'
import fs from 'fs'

import { toAssetId } from '../../assetId/assetId'
import {
  ASSET_REFERENCE,
  bchChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  osmosisChainId,
  thorchainChainId,
} from '../../constants'
import {
  bitcoinAssetMap,
  bitcoinCashAssetMap,
  cosmosAssetMap,
  dogecoinAssetMap,
  litecoinAssetMap,
  osmosisAssetMap,
  thorchainAssetMap,
} from '../../utils'

export type CoinCapCoin = {
  id: string
  rank: string
  symbol: string
  name: string
  supply: string
  maxSupply: string | null
  marketCapUsd: string
  volumeUsd24Hr: string
  priceUsd: string
  changePercent24Hr: string
  vwap24Hr: string
  explorer: string | null
}

export const writeFiles = async (data: Record<string, Record<string, string>>) => {
  const path = './src/adapters/coincap/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]) =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated CoinCap AssetId adapter data.')
}

export const fetchData = async (URL: string) =>
  (await axios.get<{ data: CoinCapCoin[] }>(URL)).data.data

export const parseEthData = (data: CoinCapCoin[]) => {
  const ethCoins = data.filter(
    ({ id, explorer }) =>
      (explorer && explorer.startsWith('https://etherscan.io/token/0x')) || id === 'ethereum',
  )

  return ethCoins.reduce((acc, { id, explorer }) => {
    const chainNamespace = CHAIN_NAMESPACE.Evm
    const chainReference = CHAIN_REFERENCE.EthereumMainnet
    let assetReference: string = ASSET_REFERENCE.Ethereum
    const assetNamespace = id === 'ethereum' ? 'slip44' : 'erc20'
    if (id !== 'ethereum' && explorer) {
      assetReference = explorer
        .replace('https://etherscan.io/token/', '')
        .split('#')[0]
        .split('?')[0]
    }
    const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
    acc[assetId] = id
    return acc
  }, {} as Record<string, string>)
}

export const parseData = (d: CoinCapCoin[]) => ({
  [ethChainId]: parseEthData(d),
  [btcChainId]: bitcoinAssetMap,
  [bchChainId]: bitcoinCashAssetMap,
  [dogeChainId]: dogecoinAssetMap,
  [ltcChainId]: litecoinAssetMap,
  [cosmosChainId]: cosmosAssetMap,
  [osmosisChainId]: osmosisAssetMap,
  [thorchainChainId]: thorchainAssetMap,
})
