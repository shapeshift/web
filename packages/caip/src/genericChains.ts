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
