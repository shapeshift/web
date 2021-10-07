import { Params } from './Params.type'
import {
  ChainTypes,
  TxHistoryResponse,
  FeeEstimateInput,
  BalanceResponse
} from '@shapeshiftoss/types'

export interface BlockchainProvider<T extends ChainTypes> {
  getBalance: (address: string) => Promise<BalanceResponse>
  getTxHistory: (address: string, params?: Params) => Promise<TxHistoryResponse<T>>
  getNonce: (address: string) => Promise<number>
  broadcastTx: (hex: string) => Promise<string>
  getFeePrice: () => Promise<string>
  getFeeUnits: (feeEstimateInput: FeeEstimateInput) => Promise<string>
}
