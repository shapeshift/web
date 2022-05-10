import { ChainId } from '@shapeshiftoss/caip'
import { BIP44Params, chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'

export type ChainAdapter<T extends ChainTypes> = {
  /**
   * Get type of adapter
   */
  getType(): T

  getChainId(): ChainId
  /**
   * Get the supported account types for an adapter
   * For UTXO coins, that's the list of UTXO account types
   * For other networks, this is unimplemented, and left as a responsibility of the consumer.
   */
  getSupportedAccountTypes?(): Array<UtxoAccountType>
  /**
   * Get the balance of an address
   */
  getAccount(pubkey: string): Promise<chainAdapters.Account<T>>

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params

  getTxHistory(input: chainAdapters.TxHistoryInput): Promise<chainAdapters.TxHistoryResponse<T>>

  buildSendTransaction(input: chainAdapters.BuildSendTxInput<T>): Promise<{
    txToSign: chainAdapters.ChainTxType<T>
  }>

  getAddress(input: chainAdapters.GetAddressInput): Promise<string>

  signTransaction(
    signTxInput: chainAdapters.SignTxInput<chainAdapters.ChainTxType<T>>
  ): Promise<string>

  signAndBroadcastTransaction?(
    signTxInput: chainAdapters.SignTxInput<chainAdapters.ChainTxType<T>>
  ): Promise<string>

  getFeeData(
    input: Partial<chainAdapters.GetFeeDataInput<T>>
  ): Promise<chainAdapters.FeeDataEstimate<T>>

  broadcastTransaction(hex: string): Promise<string>

  validateAddress(address: string): Promise<chainAdapters.ValidAddressResult>

  subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.Transaction<T>) => void,
    onError?: (err: chainAdapters.SubscribeError) => void
  ): Promise<void>

  unsubscribeTxs(input?: chainAdapters.SubscribeTxsInput): void

  closeTxs(): void
}
