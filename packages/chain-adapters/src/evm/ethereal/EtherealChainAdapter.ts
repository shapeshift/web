import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, etherealAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.EtherealMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.EtherealMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isEtherealChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.EtherealMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.EtherealMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ethereal),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: etherealAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Ethereal
  }

  getName() {
    return 'Ethereal'
  }

  getType(): KnownChainIds.EtherealMainnet {
    return KnownChainIds.EtherealMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}

export type { TokenInfo }
