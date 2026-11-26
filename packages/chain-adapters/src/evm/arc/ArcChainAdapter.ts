import type { AssetId } from '@shapeshiftoss/caip'
import { arcAssetId, ASSET_REFERENCE } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ArcMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ArcMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isArcChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.ArcMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.ArcMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Arc),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: arcAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Arc
  }

  getName() {
    return 'Arc'
  }

  getType(): KnownChainIds.ArcMainnet {
    return KnownChainIds.ArcMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
