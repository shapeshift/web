import type { ChainId } from '@shapeshiftoss/caip'

export type ParsedAccountId = {
  chainId: ChainId
  pubkey: string
}

export function parseAccountId(accountId: string): ParsedAccountId {
  const parts = accountId.split(':')
  if (parts.length >= 3) {
    const chainId = `${parts[0]}:${parts[1]}` as ChainId
    const pubkey = parts.slice(2).join(':')
    return { chainId, pubkey }
  }
  return { chainId: 'unknown' as ChainId, pubkey: accountId }
}

export function groupByChainId(
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
