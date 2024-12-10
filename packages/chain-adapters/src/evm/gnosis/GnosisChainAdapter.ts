import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, gnosisAssetId } from '@shapeshiftoss/caip'
import type { DefaultBIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.GnosisMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.GnosisMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.GnosisMainnet> {
  public static readonly defaultBIP44Params: DefaultBIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Gnosis),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs<unchained.gnosis.V1Api>) {
    super({
      assetId: gnosisAssetId,
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.gnosis.TransactionParser({
        assetId: gnosisAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Gnosis
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Gnosis)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.GnosisMainnet {
    return KnownChainIds.GnosisMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
