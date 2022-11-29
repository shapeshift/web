import { ASSET_REFERENCE, AssetId, bchAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterName } from '../../cosmossdk/types'
import { ChainAdapterArgs, UtxoBaseAdapter } from '../UtxoBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BitcoinCashMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BitcoinCashMainnet
const SUPPORTED_ACCOUNT_TYPES = [UtxoAccountType.P2pkh]

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.BitcoinCashMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.P2pkh
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.BitcoinCash),
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

    this.assetId = bchAssetId
    this.parser = new unchained.bitcoincash.TransactionParser({
      chainId: this.chainId,
    })
  }

  getDisplayName() {
    return ChainAdapterName.BitcoinCash
  }

  getType(): KnownChainIds.BitcoinCashMainnet {
    return KnownChainIds.BitcoinCashMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
