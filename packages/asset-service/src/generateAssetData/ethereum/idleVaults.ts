import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { IdleSdk, IdleVault } from '@shapeshiftoss/investor-idle'
import axios from 'axios'

import { Asset } from '../../service/AssetService'
import { ethereum } from '../baseAssets'
import { colorMap } from '../colorMap'

const getAssetSymbol = async (address: string): Promise<string | undefined> => {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY
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

const idleSdk = new IdleSdk()

const explorerData = {
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
}

const getIdleVaults = async (): Promise<Asset[]> => {
  const vaults: IdleVault[] = await idleSdk.getVaults()

  const assets: Asset[] = []

  for (const vault of vaults) {
    const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: vault.address })
    const displayIcon = `https://raw.githubusercontent.com/Idle-Labs/idle-dashboard/master/public/images/tokens/${vault.tokenName}.svg`
    const symbol = (await getAssetSymbol(vault.address)) ?? vault.tokenName // Alchemy XHRs might fail, you never know

    assets.push({
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: displayIcon,
      name: vault.poolName,
      precision: Number(18),
      symbol,
      chainId,
      assetId,
      ...explorerData,
    })
  }

  return assets
}

const getUnderlyingVaultTokens = async (): Promise<Asset[]> => {
  const vaults: IdleVault[] = await idleSdk.getVaults()

  const assets: Asset[] = []

  for (const vault of vaults) {
    const assetId = toAssetId({
      chainId,
      assetNamespace: 'erc20',
      assetReference: vault.underlyingAddress,
    })

    const symbol = (await getAssetSymbol(vault.address)) ?? vault.tokenName // Alchemy XHRs might fail, you never know

    assets.push({
      ...explorerData,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: '',
      name: vault.tokenName,
      precision: Number(18),
      symbol,
      chainId,
      assetId,
    })
  }

  return assets
}

export const getIdleTokens = async (): Promise<Asset[]> => {
  const [idleVaults, underlyingVaultTokens] = await Promise.all([
    getIdleVaults(),
    getUnderlyingVaultTokens(),
  ])

  return [...idleVaults, ...underlyingVaultTokens]
}
