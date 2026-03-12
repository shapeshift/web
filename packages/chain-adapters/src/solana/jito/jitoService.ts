import type {
  JitoGetBundleStatusesResult,
  JitoGetInflightBundleStatusesResult,
  JitoGetTipAccountsResult,
  JitoJsonRpcRequest,
  JitoJsonRpcResponse,
  JitoSendBundleResult,
  JitoSendTransactionResult,
  JitoTipFloorEntry,
} from './types'

const JITO_TIP_FLOOR_URL = 'https://bundles.jito.wtf/api/v1/bundles/tip_floor'

let requestId = 0
const nextId = () => ++requestId

const jsonRpc = async <T>(
  baseUrl: string,
  path: string,
  method: string,
  params: unknown[],
): Promise<T> => {
  const body: JitoJsonRpcRequest = {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    params,
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Jito RPC error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as JitoJsonRpcResponse<T>

  if (data.error) {
    throw new Error(`Jito RPC error: ${data.error.message} (code ${data.error.code})`)
  }

  return data.result
}

export const createJitoService = (blockEngineUrl: string) => {
  const txPath = '/api/v1/transactions'
  const bundlePath = '/api/v1/bundles'

  return {
    /**
     * Send a single transaction via Jito's enhanced endpoint.
     * Internally sets skip_preflight=true and forwards as a bundle for MEV protection.
     * The transaction MUST include a tip instruction (min 1000 lamports).
     */
    sendTransaction: (base64Tx: string): Promise<JitoSendTransactionResult> =>
      jsonRpc<JitoSendTransactionResult>(blockEngineUrl, txPath, 'sendTransaction', [
        base64Tx,
        { encoding: 'base64' },
      ]),

    /**
     * Send a bundle of up to 5 transactions for atomic sequential execution.
     * All transactions must be fully signed. Tip instruction must be in the last tx.
     * Returns a bundle ID (SHA-256 hash of all transaction signatures).
     */
    sendBundle: (base64Txs: string[]): Promise<JitoSendBundleResult> =>
      jsonRpc<JitoSendBundleResult>(blockEngineUrl, bundlePath, 'sendBundle', [
        base64Txs,
        { encoding: 'base64' },
      ]),

    /**
     * Check the status of landed bundles. Returns null for bundles that haven't landed.
     * Max 5 bundle IDs per request.
     */
    getBundleStatuses: (bundleIds: string[]): Promise<JitoGetBundleStatusesResult> =>
      jsonRpc<JitoGetBundleStatusesResult>(blockEngineUrl, bundlePath, 'getBundleStatuses', [
        bundleIds,
      ]),

    /**
     * Check the status of in-flight bundles (5-minute lookback window).
     * Status: Invalid | Pending | Failed | Landed
     * Max 5 bundle IDs per request.
     */
    getInflightBundleStatuses: (
      bundleIds: string[],
    ): Promise<JitoGetInflightBundleStatusesResult> =>
      jsonRpc<JitoGetInflightBundleStatusesResult>(
        blockEngineUrl,
        bundlePath,
        'getInflightBundleStatuses',
        [bundleIds],
      ),

    /**
     * Get the list of dynamic tip account addresses. Pick one at random to reduce contention.
     * These addresses can change - do NOT hardcode them.
     */
    getTipAccounts: (): Promise<JitoGetTipAccountsResult> =>
      jsonRpc<JitoGetTipAccountsResult>(blockEngineUrl, bundlePath, 'getTipAccounts', []),

    /**
     * Get the current tip floor from the REST API (not JSON-RPC).
     * Values are in SOL (not lamports). Use ema_landed_tips_50th_percentile as a reasonable default.
     */
    getTipFloor: async (): Promise<JitoTipFloorEntry[]> => {
      const response = await fetch(JITO_TIP_FLOOR_URL)
      if (!response.ok) {
        throw new Error(`Jito tip floor error: ${response.status} ${response.statusText}`)
      }
      return (await response.json()) as JitoTipFloorEntry[]
    },
  }
}

export type JitoService = ReturnType<typeof createJitoService>
