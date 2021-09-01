import axios, { AxiosInstance } from 'axios'
import { PaginationParams } from '../types/PaginationParams.type'
import { BlockchainProvider } from '../types/BlockchainProvider.type'
import { TxHistoryResponse, BalanceResponse, BroadcastTxResponse, FeeEstimateInput } from '..'
import https from 'https'

const axiosClient = (baseURL: string) =>
  axios.create({
    baseURL,
    // Local development doesn't require tls
    httpsAgent: new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'development' ? false : true
    })
  })

export class UnchainedProvider implements BlockchainProvider {
  axios: AxiosInstance
  constructor(baseURL: string) {
    this.axios = axiosClient(baseURL)
  }

  async getBalance(address: string): Promise<BalanceResponse | undefined> {
    const { data } = await this.axios.get<BalanceResponse>(`/balance/${address}`)
    return data
  }

  async getTxHistory(address: string, paginationParams?: PaginationParams) {
    const { data } = await this.axios.get<TxHistoryResponse>(`/txs/${address}`, {
      params: paginationParams
    })
    return data
  }

  async getNonce(address: string): Promise<number> {
    const { data } = await this.axios.get<number>(`/nonce/${address}`)
    return data
  }

  async broadcastTx(hex: string): Promise<string> {
    const { data } = await this.axios.post<BroadcastTxResponse>('/send', {
      hex
    })

    return data.txid
  }

  async getFeePrice(): Promise<string> {
    const { data } = await this.axios.get<string>(`/feeprice`)
    return data
  }

  async getFeeUnits(feeEstimateInput: FeeEstimateInput): Promise<string> {
    const { data } = await this.axios.get<string>(`/estimateGas`, {
      params: feeEstimateInput
    })
    return data
  }
}
