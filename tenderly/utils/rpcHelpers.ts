import { promisify } from 'util'
import type { HttpProvider } from 'web3-core'
import type { JsonRpcResponse } from 'web3-core-helpers'
import type { Transaction, TransactionInfo } from 'web3-types'
import { hexToNumberString } from 'web3-utils'

export type Callback<T> = (error: Error | null, result?: T) => void

export const rpcCall = async (provider: HttpProvider, method: string, params: unknown[]) => {
  const response = await promisify((cb: Callback<JsonRpcResponse>) =>
    provider.send(
      {
        method,
        params,
        jsonrpc: '2.0',
        id: new Date().getTime(),
      },
      cb,
    ),
  )()

  if (!response) throw Error('no response received')
  if (response.error) {
    console.error({
      method,
      params,
      response,
    })
    throw Error(response.error.message)
  }

  return response.result
}

export const getBalance = async (provider: HttpProvider, pubkey: string): Promise<string> => {
  const result = await rpcCall(provider, 'eth_getBalance', [pubkey, 'latest'])
  return hexToNumberString(result)
}

export const sendTransaction = (provider: HttpProvider, rawHexData: string): Promise<string> => {
  return rpcCall(provider, 'eth_sendRawTransaction', [rawHexData])
}

export const estimateGas = async (provider: HttpProvider, params: Transaction): Promise<string> => {
  const result = await rpcCall(provider, 'eth_estimateGas', [params])
  return hexToNumberString(result)
}

export const getTransactionByHash = (
  provider: HttpProvider,
  txId: string,
): Promise<TransactionInfo> => {
  return rpcCall(provider, 'eth_getTransactionByHash', [txId])
}
