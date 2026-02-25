import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, seiAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.SeiMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.SeiMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isSeiChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  if (!adapter) return false
  return (adapter as ChainAdapter).getType() === KnownChainIds.SeiMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.SeiMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Sei),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: seiAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Sei
  }

  getName() {
    return 'Sei'
  }

  getType(): KnownChainIds.SeiMainnet {
    return KnownChainIds.SeiMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
