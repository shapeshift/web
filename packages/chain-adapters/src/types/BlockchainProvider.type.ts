import { Params } from './Params.type'
import { TxHistoryResponse, FeeEstimateInput, BalanceResponse } from '../api'

export interface BlockchainProvider {
  getBalance: (address: string) => Promise<BalanceResponse | undefined>
  getTxHistory: (address: string, params?: Params) => Promise<TxHistoryResponse>
  getNonce: (address: string) => Promise<number>
  broadcastTx: (hex: string) => Promise<string>
  getFeePrice: () => Promise<string>
  getFeeUnits: (feeEstimateInput: FeeEstimateInput) => Promise<string>
}
