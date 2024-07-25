import 'dotenv/config'

import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import assert from 'assert'
import axios from 'axios'

import { ethereum } from '../baseAssets'
import { colorMap } from '../colorMap'

interface IdleVault {
  address: string
  tokenName: string
  poolName: string
}

const getAssetSymbol = async (address: string): Promise<string | undefined> => {
  const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY
  assert(typeof alchemyApiKey === 'string', 'REACT_APP_ALCHEMY_API_KEY not set')
  const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
  const alchemyPayload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'alchemy_getTokenMetadata',
    params: [address],
    id: 42,
  })
  const { data: tokenMetadata } = await axios.post(alchemyUrl, alchemyPayload)
  const symbol: string | undefined = tokenMetadata?.result?.symbol

  return symbol
}

const explorerData = {
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
}

export const getIdleTokens = async (): Promise<Asset[]> => {
  const { data: vaults } = await axios
    .get<IdleVault[] | undefined>('pools', {
      timeout: 10000,
      baseURL: 'https://api.idle.finance',
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IkFwcDIiLCJpYXQiOjE2NzAyMzc1Mjd9.pf4YYdBf_Lf6P2_oKZ5r63UMd6R44p9h5ybPprtJmT4',
      },
    })
    .catch(error => {
      console.error('Error fetching Idle vaults:', error)
      return { data: undefined }
    })

  if (!vaults) return []

  const assets: Asset[] = []
  for (const vault of vaults) {
    const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: vault.address })
    const displayIcon = `https://raw.githubusercontent.com/Idle-Labs/idle-dashboard-new/master/public/images/tokens/${vault.tokenName}.svg`
    const symbol = (await getAssetSymbol(vault.address)) ?? vault.tokenName // Alchemy XHRs might fail, you never know

    assets.push({
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: displayIcon,
      name: vault.poolName,
      precision: Number(18),
      symbol,
      chainId,
      assetId,
      relatedAssetKey: null,
      ...explorerData,
    })
  }

  return assets
}
