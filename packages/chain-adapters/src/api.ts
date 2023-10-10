import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'

import type {
  Account,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignTx,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from './types'

/**
 * Type alias for a Map that can be used to manage instances of ChainAdapters
 */
export type ChainAdapterManager = Map<ChainId, ChainAdapter<ChainId>>

export type ChainAdapter<T extends ChainId> = {
  /**
   * Internal use only. The chain-adapter name for e.g logging purposes
   */
  getName(): string
  /**
   * A user-friendly name for the chain.
   */
  getDisplayName(): string
  getChainId(): ChainId

  /**
   * Base fee asset used to pay for txs on a given chain
   */
  getFeeAssetId(): AssetId

  /**
   * Get the supported account types for an adapter
   * For UTXO coins, that's the list of UTXO account types
   * For other networks, this is unimplemented, and left as a responsibility of the consumer.
   */
  getSupportedAccountTypes?(): UtxoAccountType[]
  /**
   * Get the balance of an address
   */
  getAccount(pubkey: string): Promise<Account<T>>

  /**
   * Get BIP44Params for the given accountNumber and optional accountType
   */
  getBIP44Params(params: GetBIP44ParamsInput): BIP44Params

  getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse>

  buildSendTransaction(input: BuildSendTxInput<T>): Promise<{
    txToSign: SignTx<T>
  }>

  getAddress(input: GetAddressInput): Promise<string>

  signTransaction(signTxInput: SignTxInput<SignTx<T>>): Promise<string>

  signAndBroadcastTransaction?(signTxInput: SignTxInput<SignTx<T>>): Promise<string>

  getFeeData(input: Partial<GetFeeDataInput<T>>): Promise<FeeDataEstimate<T>>

  broadcastTransaction(hex: string): Promise<string>

  validateAddress(address: string): Promise<ValidAddressResult>

  subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError?: (err: SubscribeError) => void,
  ): Promise<void>

  unsubscribeTxs(input?: SubscribeTxsInput): void

  closeTxs(): void
}
