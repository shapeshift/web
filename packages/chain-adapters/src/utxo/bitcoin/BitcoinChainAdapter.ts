import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, btcAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../UtxoBaseAdapter'
import { UtxoBaseAdapter } from '../UtxoBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BitcoinMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BitcoinMainnet
const SUPPORTED_ACCOUNT_TYPES = [
  UtxoAccountType.SegwitNative,
  UtxoAccountType.SegwitP2sh,
  UtxoAccountType.P2pkh,
]

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.BitcoinMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.SegwitNative
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 84,
    coinType: Number(ASSET_REFERENCE.Bitcoin),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: btcAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      defaultUtxoAccountType: ChainAdapter.defaultUtxoAccountType,
      parser: new unchained.bitcoin.TransactionParser({
        assetId: btcAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
      }),
      supportedAccountTypes: SUPPORTED_ACCOUNT_TYPES,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Bitcoin
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Bitcoin,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.BitcoinMainnet {
    return KnownChainIds.BitcoinMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
