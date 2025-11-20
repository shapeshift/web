import type { ChainId } from '@shapeshiftoss/caip'
import { toAccountId } from '@shapeshiftoss/caip'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import { VultisigHDWallet } from '@shapeshiftoss/hdwallet-vultisig'
import type { AccountMetadataById, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'

const prefetchBatchedUtxoPublicKeys = async ({
  wallet,
  chainId,
  accountNumbers,
  accountTypes,
  deviceId,
}: {
  wallet: HDWallet
  chainId: ChainId
  accountNumbers: number[]
  accountTypes: UtxoAccountType[]
  deviceId: string
}) => {
  // All wallets have getPublicKeys, but only Trezor benefits from batching
  if (!isTrezor(wallet)) return

  const adapter = assertGetUtxoChainAdapter(chainId)

  await queryClient.fetchQuery({
    queryKey: ['batch-utxo-pubkeys', deviceId, chainId, accountNumbers, accountTypes],
    queryFn: () => adapter.getPublicKeys(wallet, accountNumbers, accountTypes),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

const getCachedBatchPublicKey = ({
  deviceId,
  chainId,
  accountNumber,
  accountType,
}: {
  deviceId: string | undefined
  chainId: ChainId
  accountNumber: number
  accountType: UtxoAccountType
}) => {
  if (!deviceId) return undefined

  const queries = queryClient.getQueriesData<
    Record<number, Record<UtxoAccountType, { xpub: string }>>
  >({
    queryKey: ['batch-utxo-pubkeys', deviceId, chainId],
  })

  for (const [_key, data] of queries) {
    if (data?.[accountNumber]?.[accountType]) {
      return data[accountNumber][accountType]
    }
  }

  return undefined
}

export const deriveUtxoAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  const result = await (async () => {
    if (!supportsBTC(wallet)) return {}

    const deviceId = await wallet.getDeviceID()

    // Dynamic batch prefetching: if account not in cache, prefetch its batch (e.g., account 5 → prefetch 5-9)
    if (deviceId && chainIds[0]) {
      const firstChainId = chainIds[0]
      const adapter = assertGetUtxoChainAdapter(firstChainId)
      const supportedAccountTypes = adapter.getSupportedAccountTypes()

      const hasAnyUncached = supportedAccountTypes.some(
        accountType =>
          !getCachedBatchPublicKey({ deviceId, chainId: firstChainId, accountNumber, accountType }),
      )

      if (hasAnyUncached) {
        const BATCH_SIZE = 5
        const batchStart = Math.floor(accountNumber / BATCH_SIZE) * BATCH_SIZE
        const batchNumbers = Array.from({ length: BATCH_SIZE }, (_, i) => batchStart + i)

        await prefetchBatchedUtxoPublicKeys({
          wallet,
          chainId: firstChainId,
          accountNumbers: batchNumbers,
          accountTypes: supportedAccountTypes,
          deviceId,
        })
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
      if (wallet instanceof PhantomHDWallet || wallet instanceof VultisigHDWallet) {
        // Phantom supposedly supports more script types, but only supports Segwit Native (bech32 addresses) for now
        supportedAccountTypes = [UtxoAccountType.SegwitNative]
      }
      for (const accountType of supportedAccountTypes) {
        const cachedPubKey = getCachedBatchPublicKey({
          deviceId,
          chainId,
          accountNumber,
          accountType,
        })
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
