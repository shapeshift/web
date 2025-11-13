import type { ChainId } from '@shapeshiftoss/caip'
import { solanaChainId, toAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'

const prefetchBatchedSolanaAddresses = async (
  wallet: HDWallet,
  chainId: ChainId,
  accountNumbers: number[],
  deviceId: string,
): Promise<void> => {
  if (!wallet.solanaGetAddresses) return

  const adapter = assertGetSolanaChainAdapter(chainId)

  await queryClient.fetchQuery({
    queryKey: ['batch-solana-addresses', deviceId, chainId, accountNumbers],
    queryFn: () => adapter.getAddresses(wallet, accountNumbers),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

const getCachedBatchAddress = (
  deviceId: string | undefined,
  chainId: ChainId,
  accountNumber: number,
): string | undefined => {
  if (!deviceId) return undefined

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

  const deviceId = await wallet.getDeviceID().catch(() => undefined)

  // Dynamic batch prefetching: if account not in cache, prefetch its batch (e.g., account 5 → prefetch 5-9)
  if (deviceId && wallet.solanaGetAddresses && chainIds[0]) {
    const cachedAddress = getCachedBatchAddress(deviceId, chainIds[0], accountNumber)

    if (!cachedAddress) {
      const BATCH_SIZE = 5
      const batchStart = Math.floor(accountNumber / BATCH_SIZE) * BATCH_SIZE
      const batchNumbers = Array.from({ length: BATCH_SIZE }, (_, i) => batchStart + i)

      await prefetchBatchedSolanaAddresses(wallet, chainIds[0], batchNumbers, deviceId)
    }
  }

  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId !== solanaChainId) continue

    const adapter = assertGetSolanaChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    const cachedAddress = getCachedBatchAddress(deviceId, chainId, accountNumber)
    const address = cachedAddress || (await adapter.getAddress({ accountNumber, wallet }))

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  return result
}
