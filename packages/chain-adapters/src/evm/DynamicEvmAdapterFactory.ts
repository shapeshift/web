import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, registerEvmChainReference, toAssetId } from '@shapeshiftoss/caip'
import type { AnyEvmChainId, EvmChainId, RootBip44Params } from '@shapeshiftoss/types'

import type { TokenInfo } from './SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from './SecondClassEvmAdapter'

export type DynamicEvmChainConfig = {
  chainId: number
  name: string
  displayName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrl: string
  blockExplorerUrl?: string
}

type DynamicEvmAdapterArgs = {
  config: DynamicEvmChainConfig
  getKnownTokens?: () => TokenInfo[]
}

const EVM_ROOT_BIP44_PARAMS: RootBip44Params = {
  purpose: 44,
  coinType: 60,
  accountNumber: 0,
}

class DynamicEvmAdapter extends SecondClassEvmAdapter<EvmChainId> {
  private config: DynamicEvmChainConfig
  private dynamicChainId: AnyEvmChainId

  constructor(args: DynamicEvmAdapterArgs) {
    registerEvmChainReference(String(args.config.chainId))

    const caipChainId = `eip155:${args.config.chainId}` as EvmChainId
    const nativeAssetId = toAssetId({
      chainId: caipChainId,
      assetNamespace: ASSET_NAMESPACE.slip44,
      assetReference: '60',
    })

    super({
      assetId: nativeAssetId,
      chainId: caipChainId,
      rootBip44Params: EVM_ROOT_BIP44_PARAMS,
      supportedChainIds: [caipChainId],
      rpcUrl: args.config.rpcUrl,
      getKnownTokens: args.getKnownTokens ?? (() => []),
    })

    this.config = args.config
    this.dynamicChainId = `eip155:${args.config.chainId}` as AnyEvmChainId
  }

  getType(): EvmChainId {
    return this.chainId
  }

  getDynamicChainId(): AnyEvmChainId {
    return this.dynamicChainId
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getName(): string {
    return this.config.name
  }

  getDisplayName(): string {
    return this.config.displayName
  }
}

const dynamicAdapterRegistry = new Map<number, DynamicEvmAdapter>()

export const createDynamicEvmAdapter = (args: DynamicEvmAdapterArgs): DynamicEvmAdapter => {
  const existing = dynamicAdapterRegistry.get(args.config.chainId)
  if (existing) {
    return existing
  }

  const adapter = new DynamicEvmAdapter(args)
  dynamicAdapterRegistry.set(args.config.chainId, adapter)
  return adapter
}

export const getDynamicEvmAdapter = (chainId: number): DynamicEvmAdapter | undefined => {
  return dynamicAdapterRegistry.get(chainId)
}

export const getDynamicEvmAdapterByChainId = (
  caipChainId: ChainId,
): DynamicEvmAdapter | undefined => {
  if (!caipChainId.startsWith('eip155:')) return undefined
  const chainId = Number(caipChainId.slice(7))
  return dynamicAdapterRegistry.get(chainId)
}

export const getAllDynamicEvmAdapters = (): DynamicEvmAdapter[] => {
  return Array.from(dynamicAdapterRegistry.values())
}

export const clearDynamicEvmAdapters = (): void => {
  dynamicAdapterRegistry.clear()
}
