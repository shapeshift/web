import type { AssetId } from '@shapeshiftoss/caip'
import { arbitrumAssetId, ASSET_REFERENCE } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ArbitrumMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ArbitrumMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.ArbitrumMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Arbitrum),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs<unchained.arbitrum.V1Api>) {
    super({
      assetId: arbitrumAssetId,
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: new unchained.arbitrum.TransactionParser({
        assetId: arbitrumAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Arbitrum
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Arbitrum,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.ArbitrumMainnet {
    return KnownChainIds.ArbitrumMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
