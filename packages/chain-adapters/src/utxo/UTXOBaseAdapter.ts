import { AssetId, CAIP2, CAIP19, ChainId } from '@shapeshiftoss/caip'
import { bip32ToAddressNList, HDWallet, PublicKey } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import WAValidator from 'multicoin-address-validator'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import {
  accountTypeToScriptType,
  bnOrZero,
  convertXpubVersion,
  toRootDerivationPath
} from '../utils'

export type UTXOChainTypes = ChainTypes.Bitcoin // to be extended in the future to include other UTXOs

/**
 * Currently, we don't have a generic interact for UTXO providers, but will in the future.
 * Leaving this as-is for now, but we will need to test in the future when we have additional
 * UTXO chains implemented in unchained.
 */
export interface ChainAdapterArgs {
  providers: {
    http: unchained.bitcoin.V1Api
    ws: unchained.ws.Client<unchained.Tx>
  }
  coinName: string
  chainId?: ChainId | CAIP2
}

/**
 * Base chain adapter for all UTXO chains. When extending please add your ChainType to the
 * UTXOChainTypes. For example:
 *
 * `export type UTXOChainTypes = ChainTypes.Bitcoin | ChainTypes.Litecoin`
 */
export abstract class UTXOBaseAdapter<T extends UTXOChainTypes> implements IChainAdapter<T> {
  protected chainId: ChainId | CAIP2
  protected assetId: AssetId | CAIP19
  protected coinName: string
  protected readonly supportedChainIds: ChainId | CAIP2[]
  protected readonly providers: {
    http: unchained.bitcoin.V1Api
    ws: unchained.ws.Client<unchained.Tx>
  }

  protected constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
  }

  /* Abstract Methods */

  abstract subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.Transaction<T>) => void,
    onError?: (err: chainAdapters.SubscribeError) => void
  ): Promise<void>
  abstract unsubscribeTxs(input?: chainAdapters.SubscribeTxsInput): void
  abstract closeTxs(): void
  abstract getType(): T

  abstract getTxHistory(
    input: chainAdapters.TxHistoryInput
  ): Promise<chainAdapters.TxHistoryResponse<T>>

  abstract buildBIP44Params(params: Partial<BIP44Params>): BIP44Params

  abstract buildSendTransaction(
    tx: chainAdapters.BuildSendTxInput<T>
  ): Promise<{ txToSign: chainAdapters.ChainTxType<T> }>

  abstract getAddress(input: chainAdapters.GetAddressInput): Promise<string>

  abstract getFeeData(
    input: Partial<chainAdapters.GetFeeDataInput<T>>
  ): Promise<chainAdapters.FeeDataEstimate<T>>

  abstract signTransaction(
    signTxInput: chainAdapters.SignTxInput<chainAdapters.ChainTxType<T>>
  ): Promise<string>

  /* public methods */

  /**
   * @deprecated - use `getChainId()` instead
   */
  getCaip2(): ChainId | CAIP2 {
    return this.chainId
  }

  /**
   * @deprecated - use `getChainId()` instead
   */
  getCaip19(): AssetId | CAIP19 {
    return this.assetId
  }

  getChainId(): ChainId | CAIP2 {
    return this.chainId
  }

  getAssetId(): AssetId | CAIP19 {
    return this.assetId
  }

  async getAccount(pubkey: string): Promise<chainAdapters.Account<T>> {
    if (!pubkey) {
      return ErrorHandler('UTXOBaseAdapter: pubkey parameter is not defined')
    }

    try {
      const caip = await this.getCaip2()
      const { data } = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      return {
        balance: balance.toString(),
        chain: this.getType(),
        caip2: caip,
        caip19: this.getCaip19(),
        chainSpecific: {
          addresses: data.addresses,
          nextChangeAddressIndex: data.nextChangeAddressIndex,
          nextReceiveAddressIndex: data.nextReceiveAddressIndex
        },
        pubkey: data.pubkey
      } as chainAdapters.Account<T>
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async broadcastTransaction(hex: string): Promise<string> {
    const { data } = await this.providers.http.sendTx({
      sendTxBody: { hex }
    })
    return data
  }

  async validateAddress(address: string): Promise<chainAdapters.ValidAddressResult> {
    const isValidAddress = WAValidator.validate(address, this.getType())
    if (isValidAddress) return { valid: true, result: chainAdapters.ValidAddressResultType.Valid }
    return { valid: false, result: chainAdapters.ValidAddressResultType.Invalid }
  }

  /* protected / private methods */
  protected async getPublicKey(
    wallet: HDWallet,
    bip44Params: BIP44Params,
    accountType: UtxoAccountType
  ): Promise<PublicKey> {
    const path = toRootDerivationPath(bip44Params)
    const publicKeys = await wallet.getPublicKeys([
      {
        coin: this.coinName,
        addressNList: bip32ToAddressNList(path),
        curve: 'secp256k1', // TODO(0xdef1cafe): from constant?
        scriptType: accountTypeToScriptType[accountType]
      }
    ])
    if (!publicKeys?.[0]) throw new Error("couldn't get public key")

    if (accountType) {
      return { xpub: convertXpubVersion(publicKeys[0].xpub, accountType) }
    }

    return publicKeys[0]
  }
}
