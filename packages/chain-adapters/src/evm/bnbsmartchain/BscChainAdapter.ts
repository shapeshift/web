import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, bscAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BnbSmartChainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BnbSmartChainMainnet

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.bnbsmartchain.V1Api> {
  midgardUrl: string
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BnbSmartChainMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.BnbSmartChain),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: bscAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: new unchained.bnbsmartchain.TransactionParser({
        assetId: bscAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
        midgardUrl: args.midgardUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.BnbSmartChain
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.BnbSmartChain,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.BnbSmartChainMainnet {
    return KnownChainIds.BnbSmartChainMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
