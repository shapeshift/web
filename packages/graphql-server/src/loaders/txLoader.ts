import type { ChainId } from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
import pLimit from 'p-limit'

import { getChainConfig } from '../unchained/config.js'
import { getUnchainedApi } from '../unchained/index.js'

export type Transfer = {
  type: string
  assetId: string
  value: string
  from: string[]
  to: string[]
}

export type Transaction = {
  txid: string
  pubkey: string
  blockHeight: number | null
  blockTime: number | null
  chainId: string
  status: string
  fee: string | null
  transfers: Transfer[]
}

export type TxHistoryResult = {
  accountId: string
  transactions: Transaction[]
  cursor: string | null
}

function parseAccountId(accountId: string): { chainId: ChainId; pubkey: string } {
  const parts = accountId.split(':')
  if (parts.length >= 3) {
    const chainId = `${parts[0]}:${parts[1]}` as ChainId
    const pubkey = parts.slice(2).join(':')
    return { chainId, pubkey }
  }
  return { chainId: 'unknown' as ChainId, pubkey: accountId }
}

function groupByChainId(
  accountIds: readonly string[],
): Map<ChainId, { accountId: string; pubkey: string }[]> {
  const groups = new Map<ChainId, { accountId: string; pubkey: string }[]>()

  for (const accountId of accountIds) {
    const { chainId, pubkey } = parseAccountId(accountId)
    const existing = groups.get(chainId)
    if (existing) {
      existing.push({ accountId, pubkey })
    } else {
      groups.set(chainId, [{ accountId, pubkey }])
    }
  }

  return groups
}

const limit = pLimit(5)

function getNativeAssetId(chainId: ChainId): string {
  const nativeAssetMap: Record<string, string> = {
    'eip155:1': 'eip155:1/slip44:60',
    'eip155:43114': 'eip155:43114/slip44:60',
    'eip155:10': 'eip155:10/slip44:60',
    'eip155:56': 'eip155:56/slip44:60',
    'eip155:137': 'eip155:137/slip44:60',
    'eip155:100': 'eip155:100/slip44:60',
    'eip155:42161': 'eip155:42161/slip44:60',
    'eip155:42170': 'eip155:42170/slip44:60',
    'eip155:8453': 'eip155:8453/slip44:60',
    'bip122:000000000019d6689c085ae165831e93': 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    'bip122:000000000000000000651ef99cb9fcbe': 'bip122:000000000000000000651ef99cb9fcbe/slip44:145',
    'bip122:00000000001a91e3dace36e2be3bf030': 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3',
    'bip122:12a765e31ffd4059bada1e25190f6e98': 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    'bip122:00040fe8ec8471911baa1db1266ea15d': 'bip122:00040fe8ec8471911baa1db1266ea15d/slip44:133',
    'cosmos:cosmoshub-4': 'cosmos:cosmoshub-4/slip44:118',
    'cosmos:thorchain-1': 'cosmos:thorchain-1/slip44:931',
    'cosmos:mayachain-mainnet-v1': 'cosmos:mayachain-mainnet-v1/slip44:931',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  }
  return nativeAssetMap[chainId] || `${chainId}/slip44:60`
}

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

  const groups = groupByChainId(accountIds)
  console.log(`[TxLoader] Grouped into ${groups.size} chains`)

  const chainResults = await Promise.all(
    Array.from(groups.entries()).map(([chainId, accounts]) => {
      console.log(
        `[TxLoader] Fetching tx history for ${accounts.length} accounts from chain ${chainId}`,
      )
      return fetchTxHistoryFromUnchained(chainId, accounts)
    }),
  )

  const resultMap = new Map<string, TxHistoryResult>()
  for (const chainResult of chainResults) {
    for (const result of chainResult) {
      resultMap.set(result.accountId, result)
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
