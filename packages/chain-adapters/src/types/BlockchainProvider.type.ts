import { PaginationParams } from './PaginationParams.type'
import { TxHistoryResponse, FeeEstimateInput, BalanceResponse } from '../api'

export interface BlockchainProvider {
  getBalance: (address: string) => Promise<BalanceResponse | undefined>
  getTxHistory: (address: string, paginationParams?: PaginationParams) => Promise<TxHistoryResponse>
  getNonce: (address: string) => Promise<number>
  broadcastTx: (hex: string) => Promise<string>
  getFeePrice: () => Promise<string>
  getFeeUnits: (feeEstimateInput: FeeEstimateInput) => Promise<string>
}
