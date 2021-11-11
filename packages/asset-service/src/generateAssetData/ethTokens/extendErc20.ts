import { caip19 } from '@shapeshiftoss/caip'
import {
  AssetDataSource,
  ChainTypes,
  ContractTypes,
  NetworkTypes,
  TokenAsset
} from '@shapeshiftoss/types'
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import toLower from 'lodash/toLower'
const axiosInstance: AxiosInstance = axios.create()

type YearnApiVault = {
  inception: number
  address: string
  symbol: string
  name: string
  display_name: string
  icon: string
  token: {
    name: string
    symbol: string
    address: string
    decimals: number
    display_name: string
    icon: string
  }
  tvl: {
    total_assets: number
    price: number
    tvl: number
  }
  apy: {
    net_apy: number
  }
  endorsed: boolean
  version: string
  decimals: number
  type: string
  emergency_shutdown: boolean
}

export const extendErc20 = async (): Promise<TokenAsset[]> => {
  const response: AxiosResponse = await axiosInstance.get<YearnApiVault[]>(
    `https://api.yearn.finance/v1/chains/1/vaults/all`
  )
  const yearnVaults: YearnApiVault[] = response?.data
  return yearnVaults.map((vault: YearnApiVault) => {
    return {
      color: '#FFFFFF',
      contractType: ContractTypes.ERC20,
      dataSource: AssetDataSource.YearnFinance,
      icon: vault.icon,
      name: vault.name,
      precision: vault.decimals,
      receiveSupport: true,
      secondaryColor: '#FFFFFF',
      sendSupport: true,
      symbol: vault.symbol,
      tokenId: toLower(vault.address),
      caip19: caip19.toCAIP19({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        tokenId: vault.address,
        contractType: ContractTypes.ERC20
      })
    }
  })
}
