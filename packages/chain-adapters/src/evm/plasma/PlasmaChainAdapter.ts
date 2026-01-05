import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, plasmaAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.PlasmaMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.PlasmaMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isPlasmaChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.PlasmaMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.PlasmaMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Plasma),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: plasmaAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Plasma
  }

  getName() {
    return 'Plasma'
  }

  getType(): KnownChainIds.PlasmaMainnet {
    return KnownChainIds.PlasmaMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
