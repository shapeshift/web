import { ChainAdapters, ChainTypes } from '@shapeshiftoss/types'

export const isChainAdapterOfType = <U extends ChainTypes>(
  chainType: U,
  x: ChainAdapter<ChainTypes>
): x is ChainAdapter<U> => {
  return x.getType() === chainType
}

export interface ChainAdapter<T extends ChainTypes> {
  /**
   * Get type of adapter
   */
  getType(): T

  /**
   * Get the balance of an address
   */
  getAccount(pubkey: string): Promise<ChainAdapters.Account<T>>
  getTxHistory(input: ChainAdapters.TxHistoryInput): Promise<ChainAdapters.TxHistoryResponse<T>>

  buildSendTransaction(
    input: ChainAdapters.BuildSendTxInput
  ): Promise<{
    txToSign: ChainAdapters.ChainTxType<T>
    estimatedFees: ChainAdapters.FeeDataEstimate<T>
  }>

  getAddress(input: ChainAdapters.GetAddressInput): Promise<string>

  signTransaction(
    signTxInput: ChainAdapters.SignTxInput<ChainAdapters.ChainTxType<T>>
  ): Promise<string>

  getFeeData(
    input: Partial<ChainAdapters.GetFeeDataInput>
  ): Promise<ChainAdapters.FeeDataEstimate<T>>

  broadcastTransaction(hex: string): Promise<string>

  validateAddress(address: string): Promise<ChainAdapters.ValidAddressResult>
}
