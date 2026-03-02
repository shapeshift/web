import { CF_RPC_URL } from './constants'
import type {
  ChainflipAccountInfo,
  ChainflipAsset,
  ChainflipFreeBalancesResponse,
  ChainflipLendingConfig,
  ChainflipLendingPoolsResponse,
  ChainflipLoanAccountsResponse,
  ChainflipNonNativeCallResult,
  ChainflipOraclePricesResponse,
  ChainflipRuntimeVersion,
  ChainflipSafeModeStatusesResponse,
  ChainflipSupplyBalancesResponse,
} from './types'

type ChainflipJsonRpcError = {
  code: number
  message: string
  data?: unknown
}

type ChainflipJsonRpcRequest = {
  jsonrpc: '2.0'
  method: string
  params: readonly unknown[]
  id: number
}

type ChainflipJsonRpcResponse<T> = {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: ChainflipJsonRpcError
}

const rpcRequestId = (() => {
  const state = { value: 0 }
  return () => {
    state.value += 1
    return state.value
  }
})()

const buildJsonRpcRequest = (
  method: string,
  params: readonly unknown[],
): ChainflipJsonRpcRequest => ({
  jsonrpc: '2.0',
  method,
  params,
  id: rpcRequestId(),
})

const chainflipRpc = async <T>(method: string, params: readonly unknown[] = []): Promise<T> => {
  const response = await fetch(CF_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildJsonRpcRequest(method, params)),
  })

  if (!response.ok) {
    throw new Error(`Chainflip RPC request failed with status ${response.status}`)
  }

  const data = (await response.json()) as ChainflipJsonRpcResponse<T>

  if (data.error) {
    throw new Error(data.error.message)
  }

  if (!('result' in data)) {
    throw new Error('Chainflip RPC response missing result')
  }

  return data.result as T
}

export const cfLendingPools = (asset?: ChainflipAsset): Promise<ChainflipLendingPoolsResponse> =>
  chainflipRpc('cf_lending_pools', asset ? [asset] : [])

export const cfLendingConfig = (): Promise<ChainflipLendingConfig> =>
  chainflipRpc('cf_lending_config')

export const cfLoanAccounts = (accountId?: string): Promise<ChainflipLoanAccountsResponse> =>
  chainflipRpc('cf_loan_accounts', accountId ? [accountId] : [])

export const cfLendingPoolSupplyBalances = (
  asset: ChainflipAsset,
): Promise<ChainflipSupplyBalancesResponse> =>
  chainflipRpc('cf_lending_pool_supply_balances', [asset])

export const cfAccountInfoV2 = (accountId: string): Promise<ChainflipAccountInfo> =>
  chainflipRpc('cf_account_info_v2', [accountId])

export const cfFreeBalances = (accountId: string): Promise<ChainflipFreeBalancesResponse> =>
  chainflipRpc('cf_free_balances', [accountId])

export const cfOraclePrices = (): Promise<ChainflipOraclePricesResponse> =>
  chainflipRpc('cf_oracle_prices')

export const cfSafeModeStatuses = (): Promise<ChainflipSafeModeStatusesResponse> =>
  chainflipRpc('cf_safe_mode_statuses')

export const stateGetRuntimeVersion = (): Promise<ChainflipRuntimeVersion> =>
  chainflipRpc('state_getRuntimeVersion')

export const cfEncodeNonNativeCall = ({
  hexCall,
  blocksToExpiry,
  nonceOrAccount,
}: {
  hexCall: string
  blocksToExpiry: number
  nonceOrAccount: number | string
}): Promise<ChainflipNonNativeCallResult> =>
  chainflipRpc('cf_encode_non_native_call', [
    hexCall,
    blocksToExpiry,
    nonceOrAccount,
    { Eth: 'Eip712' },
  ])

export const authorSubmitExtrinsic = (extrinsicHex: string): Promise<string> =>
  chainflipRpc('author_submitExtrinsic', [extrinsicHex])
