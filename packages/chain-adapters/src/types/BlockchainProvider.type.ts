import { ChainTypes, TxHistoryResponse, FeeEstimateInput, Account } from '@shapeshiftoss/types'

export interface BlockchainProvider<T extends ChainTypes> {
  getBalance: (address: string) => Promise<Account>
  getTxHistory: (address: string) => Promise<TxHistoryResponse<T>>
  getNonce: (address: string) => Promise<number>
  broadcastTx: (hex: string) => Promise<string>
  getFeePrice: () => Promise<string>
  getFeeUnits: (feeEstimateInput: FeeEstimateInput) => Promise<string>
}
