import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, plumeAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.PlumeMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.PlumeMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isPlumeChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.PlumeMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.PlumeMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Plume),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: plumeAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Plume
  }

  getName() {
    return 'Plume'
  }

  getType(): KnownChainIds.PlumeMainnet {
    return KnownChainIds.PlumeMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
