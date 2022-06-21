import { JsonRpcProvider } from '@ethersproject/providers'
import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { Token, Vault } from '@yfi/sdk'
import { Yearn } from '@yfi/sdk'
import toLower from 'lodash/toLower'

import { ethereum } from '../baseAssets'

const network = 1 // 1 for mainnet
const provider = new JsonRpcProvider(process.env.REACT_APP_ETHEREUM_NODE_URL)
export const yearnSdk = new Yearn(network, { provider })

const explorerData = {
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink
}

export const getYearnVaults = async (): Promise<Asset[]> => {
  const vaults: Vault[] = await yearnSdk.vaults.get()

  return vaults.map((vault: Vault) => {
    return {
      color: '#276BDB', // yearn.finance blue
      icon: vault.metadata.displayIcon,
      name: vault.name,
      precision: Number(vault.decimals),
      symbol: vault.symbol,
      tokenId: toLower(vault.address),
      chainId,
      assetId: toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: vault.address
      }),
      ...explorerData
    }
  })
}

export const getIronBankTokens = async (): Promise<Asset[]> => {
  const ironBankTokens: Token[] = await yearnSdk.ironBank.tokens()
  return ironBankTokens.map((token: Token) => {
    return {
      ...explorerData,
      color: '#276BDB', // yearn.finance blue
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId,
      assetId: toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: token.address
      })
    }
  })
}

export const getZapperTokens = async (): Promise<Asset[]> => {
  const zapperTokens: Token[] = await yearnSdk.tokens.supported()
  return zapperTokens.map((token: Token) => {
    return {
      ...explorerData,
      color: '#7057F5', // zapper protocol purple
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId,
      assetId: toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: token.address
      })
    }
  })
}

export const getUnderlyingVaultTokens = async (): Promise<Asset[]> => {
  const underlyingTokens: Token[] = await yearnSdk.vaults.tokens()
  return underlyingTokens.map((token: Token) => {
    return {
      ...explorerData,
      color: '#FFFFFF',
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId,
      assetId: toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: token.address
      })
    }
  })
}
