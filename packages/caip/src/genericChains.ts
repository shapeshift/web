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

export const GENERIC_EVM_CHAINS: EvmGenericChainConfig[] = []

export const getGenericChainConfig = (
  chainId: EvmGenericChainId | string,
): EvmGenericChainConfig | undefined => GENERIC_EVM_CHAINS.find(chain => chain.chainId === chainId)

export const isGenericChainId = (
  maybeChainId: EvmGenericChainId | string,
): maybeChainId is EvmGenericChainId =>
  GENERIC_EVM_CHAINS.some(chain => chain.chainId === maybeChainId)

export const getGenericChainAssetId = (chainId: EvmGenericChainId | string): AssetId | undefined =>
  getGenericChainConfig(chainId)?.nativeAssetId
