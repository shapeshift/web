import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, hemiAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.HemiMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.HemiMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isHemiChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.HemiMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.HemiMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Hemi),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: hemiAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Hemi
  }

  getName() {
    return 'Hemi'
  }

  getType(): KnownChainIds.HemiMainnet {
    return KnownChainIds.HemiMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
