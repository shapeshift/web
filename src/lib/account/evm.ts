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
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { canAddMetaMaskAccount } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

const prefetchBatchedEvmAddresses = async ({
  wallet,
  chainId,
  accountNumbers,
  deviceId,
}: {
  wallet: HDWallet
  chainId: ChainId
  accountNumbers: number[]
  deviceId: string
}) => {
  if (!supportsETH(wallet) || !wallet.ethGetAddresses) return

  const adapter = assertGetEvmChainAdapter(chainId)

  await queryClient.fetchQuery({
    queryKey: ['batch-evm-addresses', deviceId, chainId, accountNumbers],
    queryFn: () => adapter.getAddresses(wallet, accountNumbers),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

const getCachedBatchAddress = ({
  deviceId,
  chainId,
  accountNumber,
}: {
  deviceId: string | undefined
  chainId: ChainId
  accountNumber: number
}) => {
  if (!deviceId) return undefined

  const queries = queryClient.getQueriesData<Record<number, string>>({
    queryKey: ['batch-evm-addresses', deviceId, chainId],
  })

  for (const [_key, data] of queries) {
    if (data && data[accountNumber]) return data[accountNumber]
  }

  return undefined
}

export const deriveEvmAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args
  if (!supportsETH(wallet)) return {}

  const deviceId = await wallet.getDeviceID()
  let address = ''

  // Dynamic batch prefetching: if account not in cache, prefetch its batch (e.g., account 5 → prefetch 5-9)
  if (deviceId && wallet.ethGetAddresses && chainIds[0]) {
    const cachedAddress = getCachedBatchAddress({ deviceId, chainId: chainIds[0], accountNumber })

    if (!cachedAddress) {
      const BATCH_SIZE = 5
      const batchStart = Math.floor(accountNumber / BATCH_SIZE) * BATCH_SIZE
      const batchNumbers = Array.from({ length: BATCH_SIZE }, (_, i) => batchStart + i)

      await prefetchBatchedEvmAddresses({
        wallet,
        chainId: chainIds[0],
        accountNumbers: batchNumbers,
        deviceId,
      })
    }
  }

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
      const cachedAddress = getCachedBatchAddress({ deviceId, chainId, accountNumber })
      address = cachedAddress || (await adapter.getAddress({ accountNumber, wallet }))
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
