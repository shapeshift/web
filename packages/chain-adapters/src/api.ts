import { BIP32Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'

export interface ChainAdapter<T extends ChainTypes> {
  /**
   * Get type of adapter
   */
  getType(): T

  /**
   * Get the balance of an address
   */
  getAccount(pubkey: string): Promise<chainAdapters.Account<T>>

  buildBIP32Params(params: Partial<BIP32Params>): BIP32Params

  getTxHistory(input: chainAdapters.TxHistoryInput): Promise<chainAdapters.TxHistoryResponse<T>>

  buildSendTransaction(
    input: chainAdapters.BuildSendTxInput<T>
  ): Promise<{
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
    input: Partial<chainAdapters.GetFeeDataInput>
  ): Promise<chainAdapters.FeeDataEstimate<T>>

  broadcastTransaction(hex: string): Promise<string>

  validateAddress(address: string): Promise<chainAdapters.ValidAddressResult>

  subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.SubscribeTxsMessage<T>) => void,
    onError?: (err: chainAdapters.SubscribeError) => void
  ): Promise<void>
}
