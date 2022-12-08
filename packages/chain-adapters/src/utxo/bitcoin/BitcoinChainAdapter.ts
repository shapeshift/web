import { ASSET_REFERENCE, AssetId, btcAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import { ChainAdapterArgs, UtxoBaseAdapter } from '../UtxoBaseAdapter'

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
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      supportedAccountTypes: SUPPORTED_ACCOUNT_TYPES,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      defaultUtxoAccountType: ChainAdapter.defaultUtxoAccountType,
      ...args,
    })

    this.assetId = btcAssetId
    this.parser = new unchained.bitcoin.TransactionParser({
      chainId: this.chainId,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Bitcoin
  }

  getType(): KnownChainIds.BitcoinMainnet {
    return KnownChainIds.BitcoinMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
