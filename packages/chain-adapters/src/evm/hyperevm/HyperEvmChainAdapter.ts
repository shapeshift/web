import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, hyperEvmAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.HyperEvmMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.HyperEvmMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  knownTokens?: TokenInfo[]
}

export const isHyperEvmChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.HyperEvmMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.HyperEvmMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.HyperEvm),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: hyperEvmAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      knownTokens: args.knownTokens ?? [],
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.HyperEvm
  }

  getName() {
    return 'HyperEVM'
  }

  getType(): KnownChainIds.HyperEvmMainnet {
    return KnownChainIds.HyperEvmMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
