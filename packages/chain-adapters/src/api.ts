import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Bip44Params, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'

import type {
  Account,
  BroadcastTransactionInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBip44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
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
export type ChainAdapterManager = Map<ChainId, ChainAdapter<KnownChainIds>>

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
   * Get Bip44Params for the given accountNumber and optional accountType
   */
  getBip44Params(params: GetBip44ParamsInput): Bip44Params

  getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse>

  buildSendTransaction(input: BuildSendTxInput<T>): Promise<{
    txToSign: SignTx<T>
  }>

  getAddress(input: GetAddressInput): Promise<string>

  signTransaction(signTxInput: SignTxInput<SignTx<T>>): Promise<string>

  signAndBroadcastTransaction?(input: SignAndBroadcastTransactionInput<T>): Promise<string>

  getFeeData(input: Partial<GetFeeDataInput<T>>): Promise<FeeDataEstimate<T>>

  broadcastTransaction(input: BroadcastTransactionInput): Promise<string>

  validateAddress(address: string): Promise<ValidAddressResult>

  subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError?: (err: SubscribeError) => void,
  ): Promise<void>

  unsubscribeTxs(input?: SubscribeTxsInput): void

  closeTxs(): void
}
