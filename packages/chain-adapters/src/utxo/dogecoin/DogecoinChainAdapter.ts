import { ASSET_REFERENCE, AssetId, dogeAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterName } from '../../cosmossdk/types'
import { ChainAdapterArgs, UtxoBaseAdapter } from '../UtxoBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.DogecoinMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.DogecoinMainnet
const SUPPORTED_ACCOUNT_TYPES = [UtxoAccountType.P2pkh]

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.DogecoinMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.P2pkh
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Dogecoin),
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

    this.assetId = dogeAssetId
    this.parser = new unchained.dogecoin.TransactionParser({
      chainId: this.chainId,
    })
  }

  getDisplayName() {
    return ChainAdapterName.Dogecoin
  }

  getType(): KnownChainIds.DogecoinMainnet {
    return KnownChainIds.DogecoinMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }
}
