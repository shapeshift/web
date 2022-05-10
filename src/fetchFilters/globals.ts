import type { FetchFilterClient as FetchFilterClientType } from '../../sw/src/fetchFilters'
import type { SimpleRpc as SimpleRpcType } from '../../sw/src/simpleRpc'

declare const window: typeof globalThis & {
  FetchFilterClient: typeof FetchFilterClientType
  SimpleRpc: typeof SimpleRpcType
}

export const SimpleRpc = window.SimpleRpc
export const FetchFilterClient = window.FetchFilterClient
