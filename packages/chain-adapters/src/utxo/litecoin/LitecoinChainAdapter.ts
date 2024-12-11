import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, ltcAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../UtxoBaseAdapter'
import { UtxoBaseAdapter } from '../UtxoBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.LitecoinMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.LitecoinMainnet
const SUPPORTED_ACCOUNT_TYPES = [
  UtxoAccountType.SegwitNative,
  UtxoAccountType.SegwitP2sh,
  UtxoAccountType.P2pkh,
]

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.LitecoinMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.SegwitNative
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 84,
    coinType: Number(ASSET_REFERENCE.Litecoin),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: ltcAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      defaultUtxoAccountType: ChainAdapter.defaultUtxoAccountType,
      parser: new unchained.litecoin.TransactionParser({
        assetId: ltcAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        midgardUrl: args.midgardUrl,
      }),
      supportedAccountTypes: SUPPORTED_ACCOUNT_TYPES,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Litecoin
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Litecoin,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.LitecoinMainnet {
    return KnownChainIds.LitecoinMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
