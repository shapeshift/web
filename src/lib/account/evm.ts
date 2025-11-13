import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  fromAccountId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsArbitrum,
  supportsArbitrumNova,
  supportsAvalanche,
  supportsBase,
  supportsBSC,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
} from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { canAddMetaMaskAccount } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

/**
 * Prefetch batch of EVM addresses for Trezor wallets using react-query cache
 * Reduces popups by batching multiple account derivations into one
 */
const prefetchBatchedEvmAddresses = async (
  wallet: HDWallet,
  chainId: ChainId,
  accountNumbers: number[],
  deviceId: string,
): Promise<void> => {
  if (!isTrezor(wallet)) return

  const adapter = assertGetEvmChainAdapter(chainId)

  await queryClient.fetchQuery({
    queryKey: ['batch-evm-addresses', deviceId, chainId, accountNumbers],
    queryFn: () => adapter.getAddresses(wallet, accountNumbers),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * Get cached batch addresses if available
 */
const getCachedBatchAddress = (
  deviceId: string | undefined,
  chainId: ChainId,
  accountNumber: number,
): string | undefined => {
  if (!deviceId) return undefined

  // Try to find a cached batch that includes this account number
  const queries = queryClient.getQueriesData({
    queryKey: ['batch-evm-addresses', deviceId, chainId],
  })

  for (const [_key, data] of queries) {
    if (data && typeof data === 'object') {
      const batch = data as Record<number, string>
      if (batch[accountNumber]) return batch[accountNumber]
    }
  }

  return undefined
}

export const deriveEvmAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args
  if (!supportsETH(wallet)) return {}

  // Prefetch batch of addresses for Trezor (accounts 0-4)
  // This reduces popups from 5 to 1 for initial account import
  const deviceId = await wallet.getDeviceID().catch(() => undefined)
  if (isTrezor(wallet) && deviceId && accountNumber < 5 && accountNumber === 0) {
    // Only prefetch once when fetching account 0
    const firstChainId = chainIds[0]
    if (firstChainId) {
      await prefetchBatchedEvmAddresses(wallet, firstChainId, [0, 1, 2, 3, 4], deviceId)
    }
  }

  let address = ''
  const result: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (chainId === ethChainId && !supportsETH(wallet)) continue
    if (chainId === avalancheChainId && !supportsAvalanche(wallet)) continue
    if (chainId === optimismChainId && !supportsOptimism(wallet)) continue
    if (chainId === bscChainId && !supportsBSC(wallet)) continue
    if (chainId === polygonChainId && !supportsPolygon(wallet)) continue
    if (chainId === gnosisChainId && !supportsGnosis(wallet)) continue
    if (chainId === arbitrumChainId && !supportsArbitrum(wallet)) continue
    if (chainId === arbitrumNovaChainId && !supportsArbitrumNova(wallet)) continue
    if (chainId === baseChainId && !supportsBase(wallet)) continue
    if (
      wallet instanceof MetaMaskMultiChainHDWallet &&
      !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
    ) {
      continue
    }

    const adapter = assertGetEvmChainAdapter(chainId)
    const bip44Params = adapter.getBip44Params({ accountNumber })

    // use address if we have it, there is no need to re-derive an address for every chainId since they all use the same derivation path
    if (!address) {
      // Try to get from batched cache first (Trezor only)
      const cachedAddress = getCachedBatchAddress(deviceId, chainId, accountNumber)
      if (cachedAddress) {
        address = cachedAddress
      } else {
        // Fall back to single address derivation
        address = await adapter.getAddress({ accountNumber, wallet })
      }
    }
    if (!address) continue

    const accountId = toAccountId({ chainId, account: address })
    result[accountId] = { bip44Params }
  }

  // WCV2 defines all EVM chains as supported, but a smart contract may only be deployed on a specific chain
  // For all intents and purposes, if one smart contract is found, assume none other exists on other chains
  // and there is only one AccountId for that wallet
  let maybeWalletConnectV2SmartContractAccountId: AccountId | undefined

  for (const accountId of Object.keys(result)) {
    const { chainId, account } = fromAccountId(accountId)
    if (await fetchIsSmartContractAddressQuery(account, chainId)) {
      maybeWalletConnectV2SmartContractAccountId = accountId
      break
    }
  }

  if (maybeWalletConnectV2SmartContractAccountId)
    return {
      [maybeWalletConnectV2SmartContractAccountId]:
        result[maybeWalletConnectV2SmartContractAccountId],
    }

  return result
}
