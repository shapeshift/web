import { caip2, caip19 } from '@shapeshiftoss/caip'
import {
  AssetDataSource,
  ChainTypes,
  ContractTypes,
  NetworkTypes,
  TokenAsset
} from '@shapeshiftoss/types'
import { Token, Vault } from '@yfi/sdk'
import toLower from 'lodash/toLower'

import { yearnSdk } from './yearnSdk'

export const getYearnVaults = async (): Promise<TokenAsset[]> => {
  const vaults: Vault[] = await yearnSdk.vaults.get()

  return vaults.map((vault: Vault) => {
    return {
      color: '#276BDB', // yearn.finance blue
      contractType: ContractTypes.ERC20,
      dataSource: AssetDataSource.YearnFinance,
      icon: vault.metadata.displayIcon,
      name: vault.name,
      precision: Number(vault.decimals),
      receiveSupport: true,
      secondaryColor: '#276BDB',
      sendSupport: true,
      symbol: vault.symbol,
      tokenId: toLower(vault.address),
      caip2: caip2.toCAIP2({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET
      }),
      caip19: caip19.toCAIP19({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        tokenId: vault.address,
        contractType: ContractTypes.ERC20
      })
    }
  })
}

export const getIronBankTokens = async (): Promise<TokenAsset[]> => {
  const ironBankTokens: Token[] = await yearnSdk.ironBank.tokens()
  return ironBankTokens.map((token: Token) => {
    return {
      color: '#276BDB', // yearn.finance blue
      contractType: ContractTypes.ERC20,
      dataSource: AssetDataSource.YearnFinance,
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      receiveSupport: true,
      secondaryColor: '#276BDB',
      sendSupport: true,
      symbol: token.symbol,
      tokenId: toLower(token.address),
      caip2: caip2.toCAIP2({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET
      }),
      caip19: caip19.toCAIP19({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        tokenId: token.address,
        contractType: ContractTypes.ERC20
      })
    }
  })
}

export const getZapperTokens = async (): Promise<TokenAsset[]> => {
  const zapperTokens: Token[] = await yearnSdk.tokens.supported()
  return zapperTokens.map((token: Token) => {
    return {
      color: '#7057F5', // zapper protocol purple
      contractType: ContractTypes.ERC20,
      dataSource: AssetDataSource.YearnFinance,
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      receiveSupport: true,
      secondaryColor: '#7057F5',
      sendSupport: true,
      symbol: token.symbol,
      tokenId: toLower(token.address),
      caip2: caip2.toCAIP2({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET
      }),
      caip19: caip19.toCAIP19({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        tokenId: token.address,
        contractType: ContractTypes.ERC20
      })
    }
  })
}

export const getUnderlyingVaultTokens = async (): Promise<TokenAsset[]> => {
  const underlyingTokens: Token[] = await yearnSdk.vaults.tokens()
  return underlyingTokens.map((token: Token) => {
    return {
      color: '#FFFFFF',
      contractType: ContractTypes.ERC20,
      dataSource: AssetDataSource.YearnFinance,
      icon: token.icon ?? '',
      name: token.name,
      precision: Number(token.decimals),
      receiveSupport: true,
      secondaryColor: '#FFFFFF',
      sendSupport: true,
      symbol: token.symbol,
      tokenId: toLower(token.address),
      caip2: caip2.toCAIP2({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET
      }),
      caip19: caip19.toCAIP19({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        tokenId: token.address,
        contractType: ContractTypes.ERC20
      })
    }
  })
}
