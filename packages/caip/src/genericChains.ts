import type { Address } from 'viem'
import type * as chains from 'viem/chains'

import type { AssetId } from './assetId/assetId'

export type EvmGenericChainId = `eip155:${number}`

export type EvmGenericChainConfig = {
  chainId: EvmGenericChainId
  name: string
  displayName: string
  nativeAssetId: AssetId
  rpcUrl?: string
  iconName: string
  viemChainKey?: keyof typeof chains
  multicallAddress?: Address
  explorerUrl?: string
}

export const GENERIC_EVM_CHAINS: EvmGenericChainConfig[] = [
  {
    chainId: 'eip155:42220',
    name: 'celo',
    displayName: 'Celo',
    nativeAssetId: 'eip155:42220/slip44:60',
    iconName: 'celo',
    viemChainKey: 'celo',
    explorerUrl: 'https://celoscan.io',
  },
  {
    chainId: 'eip155:59144',
    name: 'linea',
    displayName: 'Linea',
    nativeAssetId: 'eip155:59144/slip44:60',
    iconName: 'linea',
    viemChainKey: 'linea',
    explorerUrl: 'https://lineascan.build',
  },
  // {
  //   chainId: 'eip155:1329',
  //   name: 'sei',
  //   displayName: 'Sei',
  //   nativeAssetId: 'eip155:1329/slip44:60',
  //   iconName: 'sei',
  //   viemChainKey: 'sei',
  //   explorerUrl: 'https://seitrace.com',
  // },
]

export const getGenericChainConfig = (
  chainId: EvmGenericChainId | string,
): EvmGenericChainConfig | undefined => GENERIC_EVM_CHAINS.find(chain => chain.chainId === chainId)

export const isGenericChainId = (
  maybeChainId: EvmGenericChainId | string,
): maybeChainId is EvmGenericChainId =>
  GENERIC_EVM_CHAINS.some(chain => chain.chainId === maybeChainId)

export const getGenericChainAssetId = (chainId: EvmGenericChainId | string): AssetId | undefined =>
  getGenericChainConfig(chainId)?.nativeAssetId
