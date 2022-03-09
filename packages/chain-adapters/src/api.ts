import { CAIP2 } from '@shapeshiftoss/caip'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'

export type ChainAdapter<T extends ChainTypes> = {
  /**
   * Get type of adapter
   */
  getType(): T

  getCaip2(): CAIP2

  getChainId(): CAIP2
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
