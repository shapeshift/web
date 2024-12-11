import type { AssetId } from '@shapeshiftoss/caip'
import { arbitrumNovaAssetId, ASSET_REFERENCE } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ArbitrumNovaMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ArbitrumNovaMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.ArbitrumNovaMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.ArbitrumNova),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs<unchained.arbitrumNova.V1Api>) {
    super({
      assetId: arbitrumNovaAssetId,
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: new unchained.arbitrumNova.TransactionParser({
        assetId: arbitrumNovaAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.ArbitrumNova
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.ArbitrumNova,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.ArbitrumNovaMainnet {
    return KnownChainIds.ArbitrumNovaMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
