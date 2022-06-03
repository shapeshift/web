import { ethChainId as chainId, toAssetId } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Token, Vault } from '@yfi/sdk'
import toLower from 'lodash/toLower'

import { yearnSdk } from './yearnSdk'

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
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET
    }
  })
}

export const getIronBankTokens = async (): Promise<Asset[]> => {
  const ironBankTokens: Token[] = await yearnSdk.ironBank.tokens()
  return ironBankTokens.map((token: Token) => {
    return {
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET,
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
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET,
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
      explorer: 'https://etherscan.io',
      explorerAddressLink: 'https://etherscan.io/address/',
      explorerTxLink: 'https://etherscan.io/tx/',
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET,
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
