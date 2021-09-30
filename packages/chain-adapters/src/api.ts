import { Params } from './types/Params.type'
import { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import {
  BalanceResponse,
  BuildSendTxInput,
  ChainTypes,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignTxInput,
  TxHistoryResponse,
  ValidAddressResult
} from '@shapeshiftoss/types'

export interface ChainAdapter {
  /**
   * Get type of adapter
   */
  getType(): ChainTypes

  /**
   * Get the balance of an address
   */
  getBalance(address: string): Promise<BalanceResponse | undefined>

  /**
   * Get Transaction History for an address
   */
  getTxHistory(address: string, params?: Params): Promise<TxHistoryResponse>

  buildSendTransaction(
    input: BuildSendTxInput
  ): Promise<{ txToSign: ETHSignTx; estimatedFees: FeeDataEstimate }>

  getAddress(input: GetAddressInput): Promise<string>

  signTransaction(signTxInput: SignTxInput): Promise<string>

  getFeeData(input: Partial<GetFeeDataInput>): Promise<FeeDataEstimate>

  broadcastTransaction(hex: string): Promise<string>

  validateAddress(address: string): Promise<ValidAddressResult>
}
