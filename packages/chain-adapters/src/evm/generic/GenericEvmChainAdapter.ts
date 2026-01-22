import type { AssetId, EvmGenericChainConfig, EvmGenericChainId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'

import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

export type GenericChainAdapterArgs = {
  config: EvmGenericChainConfig
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isGenericEvmChainAdapter = (adapter: unknown): adapter is GenericEvmChainAdapter => {
  return adapter instanceof GenericEvmChainAdapter
}

export class GenericEvmChainAdapter extends SecondClassEvmAdapter<EvmGenericChainId> {
  private readonly config: EvmGenericChainConfig

  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: 60,
    accountNumber: 0,
  }

  constructor(args: GenericChainAdapterArgs) {
    const { config, rpcUrl, getKnownTokens } = args

    super({
      assetId: config.nativeAssetId,
      chainId: config.chainId,
      rootBip44Params: GenericEvmChainAdapter.rootBip44Params,
      supportedChainIds: [config.chainId],
      rpcUrl,
      getKnownTokens,
    })

    this.config = config
  }

  getDisplayName(): string {
    return this.config.displayName
  }

  getName(): string {
    return this.config.name
  }

  getType(): EvmGenericChainId {
    return this.config.chainId
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getExplorerUrl(): string | undefined {
    return this.config.explorerUrl
  }
}

export type { TokenInfo }
