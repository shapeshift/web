// Jito Block Engine JSON-RPC types
// API docs: https://docs.jito.wtf/lowlatencytxnsend/

export type JitoJsonRpcRequest = {
  jsonrpc: '2.0'
  id: number
  method: string
  params: unknown[]
}

export type JitoJsonRpcResponse<T> = {
  jsonrpc: '2.0'
  id: number
  result: T
  error?: { code: number; message: string }
}

// sendTransaction response: transaction signature (base-58 string)
export type JitoSendTransactionResult = string

// sendBundle response: bundle ID (SHA-256 hash of the bundle's transaction signatures)
export type JitoSendBundleResult = string

// getBundleStatuses response
export type JitoBundleStatus = {
  bundle_id: string
  transactions: string[]
  slot: number
  confirmation_status: 'processed' | 'confirmed' | 'finalized' | null
  err: { Ok: null } | Record<string, unknown>
}

export type JitoGetBundleStatusesResult = {
  context: { slot: number }
  value: (JitoBundleStatus | null)[]
}

// getInflightBundleStatuses response
export type JitoInflightBundleStatus = {
  bundle_id: string
  status: 'Invalid' | 'Pending' | 'Failed' | 'Landed'
  landed_slot: number | null
}

export type JitoGetInflightBundleStatusesResult = {
  context: { slot: number }
  value: JitoInflightBundleStatus[]
}

// getTipAccounts response: array of base-58 encoded tip account addresses
export type JitoGetTipAccountsResult = string[]

// Tip floor REST API response (values in SOL, not lamports)
export type JitoTipFloorEntry = {
  time: string
  landed_tips_25th_percentile: number
  landed_tips_50th_percentile: number
  landed_tips_75th_percentile: number
  landed_tips_95th_percentile: number
  landed_tips_99th_percentile: number
  ema_landed_tips_50th_percentile: number
}
