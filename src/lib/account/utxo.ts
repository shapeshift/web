import type { ChainId } from '@shapeshiftoss/caip'
import { toAccountId } from '@shapeshiftoss/caip'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { AccountMetadataById, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'

/**
 * Prefetch batch of UTXO public keys for Trezor wallets using react-query cache
 * Batches multiple accounts × script types into one popup
 */
const prefetchBatchedUtxoPublicKeys = async (
  wallet: HDWallet,
  chainId: ChainId,
  accountNumbers: number[],
  accountTypes: UtxoAccountType[],
  deviceId: string,
): Promise<void> => {
  if (!isTrezor(wallet)) return

  const adapter = assertGetUtxoChainAdapter(chainId)

  await queryClient.fetchQuery({
    queryKey: ['batch-utxo-pubkeys', deviceId, chainId, accountNumbers, accountTypes],
    queryFn: () => adapter.getPublicKeys(wallet, accountNumbers, accountTypes),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * Get cached UTXO public key if available
 */
const getCachedBatchPublicKey = (
  deviceId: string | undefined,
  chainId: ChainId,
  accountNumber: number,
  accountType: UtxoAccountType,
): { xpub: string } | undefined => {
  if (!deviceId) return undefined

  // Try to find a cached batch that includes this account + type
  const queries = queryClient.getQueriesData({
    queryKey: ['batch-utxo-pubkeys', deviceId, chainId],
  })

  for (const [_key, data] of queries) {
    if (data && typeof data === 'object') {
      const batch = data as Record<number, Record<UtxoAccountType, { xpub: string }>>
      if (batch[accountNumber]?.[accountType]) {
        return batch[accountNumber][accountType]
      }
    }
  }

  return undefined
}

export const deriveUtxoAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  const result = await (async () => {
    if (!supportsBTC(wallet)) return {}

    // Prefetch batch of public keys for Trezor (accounts 0-4 × all script types)
    // This reduces popups from 15 to 1 for 5 BTC accounts
    const deviceId = await wallet.getDeviceID().catch(() => undefined)
    if (isTrezor(wallet) && deviceId && accountNumber < 5 && accountNumber === 0) {
      // Only prefetch once when fetching account 0
      const firstChainId = chainIds[0]
      if (firstChainId) {
        const adapter = assertGetUtxoChainAdapter(firstChainId)
        const supportedAccountTypes = adapter.getSupportedAccountTypes()
        await prefetchBatchedUtxoPublicKeys(
          wallet,
          firstChainId,
          [0, 1, 2, 3, 4],
          supportedAccountTypes,
          deviceId,
        )
      }
    }

    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      if (!utxoChainIds.includes(chainId as UtxoChainId))
        throw new Error(`${chainId} does not exist in ${utxoChainIds}`)
      const adapter = assertGetUtxoChainAdapter(chainId)

      let supportedAccountTypes = adapter.getSupportedAccountTypes()
      if (wallet instanceof MetaMaskMultiChainHDWallet) {
        // MetaMask snaps adapter only supports legacy for BTC and LTC
        supportedAccountTypes = [UtxoAccountType.P2pkh]
      }
      if (wallet instanceof PhantomHDWallet) {
        // Phantom supposedly supports more script types, but only supports Segwit Native (bech32 addresses) for now
        supportedAccountTypes = [UtxoAccountType.SegwitNative]
      }
      for (const accountType of supportedAccountTypes) {
        // Try to get from batched cache first (Trezor only)
        const cachedPubKey = getCachedBatchPublicKey(deviceId, chainId, accountNumber, accountType)
        const pubkey = cachedPubKey
          ? cachedPubKey.xpub
          : (await adapter.getPublicKey(wallet, accountNumber, accountType)).xpub

        if (!pubkey) continue

        const bip44Params = adapter.getBip44Params({ accountNumber, accountType })
        const accountId = toAccountId({ chainId, account: pubkey })

        acc[accountId] = { accountType, bip44Params }
      }
    }
    return acc
  })()
  return result
}
