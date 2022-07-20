import { ASSET_REFERENCE, AssetId, ChainId, toAssetId } from '@shapeshiftoss/caip'
import { BTCOutputScriptType } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapter as IChainAdapter } from '../api'
import {
  ChainAdapterArgs,
  UTXOBaseAdapter,
  UtxoChainId,
  UTXOChainIds
} from '../utxo/UTXOBaseAdapter'

export class ChainAdapter
  extends UTXOBaseAdapter<KnownChainIds.DogecoinMainnet>
  implements IChainAdapter<KnownChainIds.DogecoinMainnet>
{
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: 3,
    accountNumber: 0
  }
  public static readonly defaultUtxoAccountType: UtxoAccountType = UtxoAccountType.P2pkh

  private static readonly supportedAccountTypes: UtxoAccountType[] = [UtxoAccountType.P2pkh]

  protected readonly supportedChainIds: UtxoChainId[] = [KnownChainIds.DogecoinMainnet]

  protected chainId = this.supportedChainIds[0]

  private parser: unchained.bitcoin.TransactionParser

  constructor(args: ChainAdapterArgs) {
    super(args)

    if (args.chainId && !UTXOChainIds.includes(args.chainId)) {
      throw new Error(`${this.getDisplayName()} chainId ${args.chainId} not supported`)
    }
    if (!args.chainId) {
      args.chainId = KnownChainIds.DogecoinMainnet
    }

    this.coinName = args.coinName
    this.assetId = toAssetId({
      chainId: this.chainId,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Dogecoin
    })

    this.parser = new unchained.bitcoin.TransactionParser({
      chainId: this.chainId,
      assetReference: ASSET_REFERENCE.Dogecoin
    })
  }

  getChainId(): ChainId {
    return KnownChainIds.DogecoinMainnet
  }

  getAssetId(): AssetId {
    return 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3'
  }

  accountTypeToOutputScriptType(accountType: UtxoAccountType): BTCOutputScriptType {
    if (accountType != UtxoAccountType.P2pkh) {
      throw new Error(`dogecoin adapter does not support accountType ${accountType}`)
    }
    return BTCOutputScriptType.PayToAddress
  }

  getDefaultAccountType(): UtxoAccountType {
    return ChainAdapter.defaultUtxoAccountType
  }

  getDefaultBip44Params(): BIP44Params {
    return ChainAdapter.defaultBIP44Params
  }

  getTransactionParser() {
    return this.parser
  }

  getDisplayName() {
    return 'Dogecoin'
  }

  getType(): KnownChainIds.DogecoinMainnet {
    return KnownChainIds.DogecoinMainnet
  }

  getFeeAssetId(): AssetId {
    return this.getAssetId()
  }

  getSupportedAccountTypes() {
    return ChainAdapter.supportedAccountTypes
  }

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params {
    return { ...ChainAdapter.defaultBIP44Params, ...params }
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }
}
