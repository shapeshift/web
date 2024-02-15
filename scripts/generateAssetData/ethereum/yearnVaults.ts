import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Token, Vault } from '@yfi/sdk'
import { Yearn } from '@yfi/sdk'
import { ethers } from 'ethers'
import toLower from 'lodash/toLower'

import { ethereum } from '../baseAssets'
import { colorMap } from '../colorMap'

const network = 1 // 1 for mainnet
// This is wrong, but this doesn't matter since yearn is nuked
// 1. we should not instantiate a provider at module scope, which will make an XHR for nothing when this module gets evaluated
// 2. we should pass the provider in as a dependency, since it is cached in web
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL)
// @ts-ignore @yfi/sdk expects an ethers v5 provider, but we're now using v6
export const yearnSdk = new Yearn(network, { provider })

const explorerData = {
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
}

export const getYearnVaults = async (): Promise<Asset[]> => {
  const vaults: Vault[] = await yearnSdk.vaults.get()

  return vaults.map((vault: Vault) => {
    const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: vault.address })
    return {
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: vault.metadata.displayIcon,
      name: vault.name,
      precision: Number(vault.decimals),
      symbol: vault.symbol,
      tokenId: toLower(vault.address),
      chainId,
      assetId,
      ...explorerData,
    }
  })
}

export const getZapperTokens = async (): Promise<Asset[]> => {
  const zapperTokens: Token[] = await yearnSdk.tokens.supported()
  return zapperTokens.map((token: Token) => {
    const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: token.address })

    return {
      ...explorerData,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId,
      assetId,
    }
  })
}

export const getUnderlyingVaultTokens = async (): Promise<Asset[]> => {
  const underlyingTokens: Token[] = await yearnSdk.vaults.tokens()
  return underlyingTokens.map((token: Token) => {
    const assetId = toAssetId({ chainId, assetNamespace: 'erc20', assetReference: token.address })

    return {
      ...explorerData,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId,
      assetId,
    }
  })
}
