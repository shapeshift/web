import type { ChainId } from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
import pLimit from 'p-limit'

import { getNativeAssetId } from '../constants.js'
import type { Transaction, Transfer, TxHistoryResult } from '../types.js'
import { getChainConfig } from '../unchained/config.js'
import { getUnchainedApi } from '../unchained/index.js'
import { groupByChainId } from '../utils.js'

export type { Transaction, Transfer, TxHistoryResult }

const TX_CACHE_TTL_MS = 5 * 60_000

type CachedTxHistory = {
  data: TxHistoryResult
  timestamp: number
}

const txCache = new Map<string, CachedTxHistory>()

const limit = pLimit(5)

type RawTx = {
  txid: string
  blockHash?: string
  blockHeight?: number
  blockTime?: number
  confirmations?: number
  fee?: string
  value?: string
  status?: string
  from?: string
  to?: string
  vin?: { addresses?: string[]; value?: string }[]
  vout?: { addresses?: string[]; value?: string }[]
  transfers?: {
    type?: string
    assetId?: string
    value?: string
    from?: string
    to?: string
  }[]
}

function parseTx(rawTx: RawTx, pubkey: string, chainId: ChainId): Transaction {
  const nativeAssetId = getNativeAssetId(chainId)

  const transfers: Transfer[] = []

  if (rawTx.transfers && Array.isArray(rawTx.transfers)) {
    for (const t of rawTx.transfers) {
      transfers.push({
        type: t.type || 'Unknown',
        assetId: t.assetId || nativeAssetId,
        value: t.value || '0',
        from: t.from ? [t.from] : [],
        to: t.to ? [t.to] : [],
      })
    }
  } else if (rawTx.from || rawTx.to || rawTx.value) {
    transfers.push({
      type: rawTx.from?.toLowerCase() === pubkey.toLowerCase() ? 'Send' : 'Receive',
      assetId: nativeAssetId,
      value: rawTx.value || '0',
      from: rawTx.from ? [rawTx.from] : [],
      to: rawTx.to ? [rawTx.to] : [],
    })
  } else if (rawTx.vin && rawTx.vout) {
    const allInputAddresses = rawTx.vin.flatMap(v => v.addresses || [])
    const allOutputAddresses = rawTx.vout.flatMap(v => v.addresses || [])
    const totalValue = rawTx.vout.reduce((sum, v) => sum + BigInt(v.value || '0'), BigInt(0))

    const isSend = allInputAddresses.some(addr => addr.toLowerCase() === pubkey.toLowerCase())

    transfers.push({
      type: isSend ? 'Send' : 'Receive',
      assetId: nativeAssetId,
      value: totalValue.toString(),
      from: allInputAddresses,
      to: allOutputAddresses,
    })
  }

  let status = 'Unknown'
  if (rawTx.status) {
    status = rawTx.status
  } else if (rawTx.confirmations !== undefined) {
    status = rawTx.confirmations > 0 ? 'Confirmed' : 'Pending'
  } else if (rawTx.blockHeight !== undefined && rawTx.blockHeight > 0) {
    status = 'Confirmed'
  }

  return {
    txid: rawTx.txid,
    pubkey,
    blockHeight: rawTx.blockHeight ?? null,
    blockTime: rawTx.blockTime ?? null,
    chainId,
    status,
    fee: rawTx.fee ?? null,
    transfers,
  }
}

async function fetchTxHistoryFromUnchained(
  chainId: ChainId,
  accounts: { accountId: string; pubkey: string }[],
): Promise<TxHistoryResult[]> {
  const config = getChainConfig(chainId)
  if (!config) {
    console.warn(`[TxLoader] No config for chain ${chainId}, returning empty tx history`)
    return accounts.map(({ accountId }) => ({
      accountId,
      transactions: [],
      cursor: null,
    }))
  }

  const api = getUnchainedApi(chainId)
  if (!api) {
    console.warn(`[TxLoader] No API for chain ${chainId}, returning empty tx history`)
    return accounts.map(({ accountId }) => ({
      accountId,
      transactions: [],
      cursor: null,
    }))
  }

  const results = await Promise.all(
    accounts.map(({ accountId, pubkey }) =>
      limit(async (): Promise<TxHistoryResult> => {
        try {
          const data = await api.getTxHistory({
            pubkey,
            pageSize: 10,
          })

          const transactions: Transaction[] = []

          if (data.txs && Array.isArray(data.txs)) {
            for (const rawTx of data.txs) {
              transactions.push(parseTx(rawTx as RawTx, pubkey, chainId))
            }
          }

          return {
            accountId,
            transactions,
            cursor: data.cursor ?? null,
          }
        } catch (error) {
          console.error(`[TxLoader] Error fetching tx history for ${accountId}:`, error)
          return {
            accountId,
            transactions: [],
            cursor: null,
          }
        }
      }),
    ),
  )

  return results
}

async function batchGetTransactions(accountIds: readonly string[]): Promise<TxHistoryResult[]> {
  console.log(`[TxLoader] Batching ${accountIds.length} tx history requests`)

  const now = Date.now()
  const cachedResults = new Map<string, TxHistoryResult>()
  const uncachedAccountIds: string[] = []

  for (const accountId of accountIds) {
    const cached = txCache.get(accountId)
    if (cached && now - cached.timestamp < TX_CACHE_TTL_MS) {
      cachedResults.set(accountId, cached.data)
    } else {
      uncachedAccountIds.push(accountId)
    }
  }

  if (cachedResults.size > 0) {
    console.log(`[TxLoader] Cache hit for ${cachedResults.size} accounts`)
  }

  if (uncachedAccountIds.length === 0) {
    return accountIds.map(
      id =>
        cachedResults.get(id) || {
          accountId: id,
          transactions: [],
          cursor: null,
        },
    )
  }

  console.log(`[TxLoader] Fetching ${uncachedAccountIds.length} uncached tx histories`)

  const groups = groupByChainId(uncachedAccountIds)
  console.log(`[TxLoader] Grouped into ${groups.size} chains`)

  const chainResults = await Promise.all(
    Array.from(groups.entries()).map(([chainId, accounts]) => {
      console.log(
        `[TxLoader] Fetching tx history for ${accounts.length} accounts from chain ${chainId}`,
      )
      return fetchTxHistoryFromUnchained(chainId, accounts)
    }),
  )

  const resultMap = new Map<string, TxHistoryResult>(cachedResults)
  for (const chainResult of chainResults) {
    for (const result of chainResult) {
      resultMap.set(result.accountId, result)
      txCache.set(result.accountId, { data: result, timestamp: now })
    }
  }

  return accountIds.map(
    id =>
      resultMap.get(id) || {
        accountId: id,
        transactions: [],
        cursor: null,
      },
  )
}

export function createTxLoader(): DataLoader<string, TxHistoryResult> {
  return new DataLoader<string, TxHistoryResult>(batchGetTransactions, {
    cache: true,
    maxBatchSize: 50,
  })
}
