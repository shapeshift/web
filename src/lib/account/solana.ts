import type { ChainId } from '@shapeshiftoss/caip'
import { solanaChainId, toAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'

/**
 * Prefetch batch of Solana addresses for Trezor wallets using react-query cache
 * Reduces popups by batching multiple account derivations into one
 */
const prefetchBatchedSolanaAddresses = async (
  wallet: HDWallet,
  chainId: ChainId,
  accountNumbers: number[],
  deviceId: string,
): Promise<void> => {
  if (!isTrezor(wallet)) return

  const adapter = assertGetSolanaChainAdapter(chainId)

  await queryClient.fetchQuery({
    queryKey: ['batch-solana-addresses', deviceId, chainId, accountNumbers],
    queryFn: () => adapter.getAddresses(wallet, accountNumbers),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * Get cached batch address if available
 */
const getCachedBatchAddress = (
  deviceId: string | undefined,
  chainId: ChainId,
  accountNumber: number,
): string | undefined => {
  if (!deviceId) return undefined

  // Try to find a cached batch that includes this account number
  const queries = queryClient.getQueriesData({
    queryKey: ['batch-solana-addresses', deviceId, chainId],
  })

  for (const [_key, data] of queries) {
    if (data && typeof data === 'object') {
      const batch = data as Record<number, string>
      if (batch[accountNumber]) return batch[accountNumber]
    }
  }

  return undefined
}

export const deriveSolanaAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsSolana(wallet)) return {}

  // Prefetch batch of addresses for Trezor (accounts 0-4)
  const deviceId = await wallet.getDeviceID().catch(() => undefined)
  if (isTrezor(wallet) && deviceId && accountNumber < 5 && accountNumber === 0) {
    // Only prefetch once when fetching account 0
    const firstChainId = chainIds[0]
    if (firstChainId) {
      await prefetchBatchedSolanaAddresses(wallet, firstChainId, [0, 1, 2, 3, 4], deviceId)
    }
  }

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== solanaChainId) continue

    const adapter = assertGetSolanaChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    // Try to get from batched cache first (Trezor only)
    const cachedAddress = getCachedBatchAddress(deviceId, chainId, accountNumber)
    const address = cachedAddress || (await adapter.getAddress({ accountNumber, wallet }))

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
