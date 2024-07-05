import type { ChainReference } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, CHAIN_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import fs from 'fs'
import path from 'path'

type Token = {
  chainId: number
  address: string
  decimals: number
  name: string
  symbol: string
  logoURI: string
}

type TokenList = {
  name: string
  logoURI: string
  keywords: string[]
  version: {
    major: number
    minor: number
    patch: number
  }
  tokens: Token[]
}

const ethUrl =
  'https://gitlab.com/thorchain/thornode/-/raw/develop/common/tokenlist/ethtokens/eth_mainnet_latest.json'
const avaxUrl =
  'https://gitlab.com/thorchain/thornode/-/raw/develop/common/tokenlist/avaxtokens/avax_mainnet_latest.json'
const bscUrl =
  'https://gitlab.com/thorchain/thornode/-/raw/develop/common/tokenlist/bsctokens/bsc_mainnet_latest.json'

const outputPath =
  '../../packages/swapper/src/swappers/ThorchainSwapper/generated/generatedThorLongtailTokens.json'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

export const generateThorLongtailTokens = async () => {
  const thorService = axios.create(axiosConfig)

  // Fetch token lists concurrently using Promise.all
  const [ethResponse, avaxResponse, bscResponse] = await Promise.all([
    thorService.get<TokenList>(ethUrl).catch(err => {
      console.error('ETH token list not found, the URL might have changed upstream:', err)
      process.exit(1)
    }),
    thorService.get<TokenList>(avaxUrl).catch(err => {
      console.error('AVAX token list not found, the URL might have changed upstream:', err)
      process.exit(1)
    }),
    thorService.get<TokenList>(bscUrl).catch(err => {
      console.error('BSC token list not found, the URL might have changed upstream:', err)
      process.exit(1)
    }),
  ])

  if (ethResponse.status !== 200 || avaxResponse.status !== 200 || bscResponse.status !== 200) {
    console.error('Network error', { ethResponse, avaxResponse, bscResponse })
    return
  }

  const ethData = ethResponse.data
  const avaxData = avaxResponse.data
  const bscData = bscResponse.data

  const erc20Tokens = [...ethData.tokens, ...avaxData.tokens]
  const bep20Tokens = bscData.tokens
  const erc20AssetIds = erc20Tokens.map(token =>
    toAssetId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: String(token.chainId) as ChainReference,
      assetNamespace: ASSET_NAMESPACE.erc20,
      assetReference: token.address,
    }),
  )
  const bep20AssetIds = bep20Tokens.map(token =>
    toAssetId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: String(token.chainId) as ChainReference,
      assetNamespace: ASSET_NAMESPACE.bep20,
      assetReference: token.address,
    }),
  )

  const assetIds = [...erc20AssetIds, ...bep20AssetIds]

  await fs.promises.writeFile(
    path.join(__dirname, outputPath),
    // beautify the file for github diff.
    JSON.stringify(assetIds, null, 2),
  )
}

generateThorLongtailTokens()
  .then(() => {
    console.info('generateThorLongtailTokens() done')
  })
  .catch(err => console.info(err))
