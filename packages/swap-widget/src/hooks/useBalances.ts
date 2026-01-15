import { ASSET_NAMESPACE, CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'
import { getBalance, readContract } from '@wagmi/core'
import PQueue from 'p-queue'
import { useMemo } from 'react'
import { erc20Abi } from 'viem'
import { useBalance, useConfig } from 'wagmi'

import type { SupportedChainId } from '../config/wagmi'
import type { AssetId } from '../types'
import { formatAmount } from '../types'

const CONCURRENCY_LIMIT = 5
const DELAY_BETWEEN_BATCHES_MS = 50

const balanceQueue = new PQueue({
  concurrency: CONCURRENCY_LIMIT,
  interval: DELAY_BETWEEN_BATCHES_MS,
  intervalCap: CONCURRENCY_LIMIT,
})

type BalanceResult = {
  assetId: AssetId
  balance: string
  balanceFormatted: string
}

type BalancesMap = Record<AssetId, BalanceResult>

const parseAssetId = (
  assetId: AssetId,
): { chainId: number; tokenAddress?: `0x${string}` } | null => {
  try {
    const { chainNamespace, chainReference, assetNamespace, assetReference } = fromAssetId(assetId)

    if (chainNamespace !== CHAIN_NAMESPACE.Evm) return null

    const evmChainId = Number(chainReference)

    if (assetNamespace === ASSET_NAMESPACE.erc20) {
      return {
        chainId: evmChainId,
        tokenAddress: assetReference as `0x${string}`,
      }
    }

    return { chainId: evmChainId }
  } catch {
    return null
  }
}

export const useAssetBalance = (
  address: string | undefined,
  assetId: AssetId | undefined,
  precision: number = 18,
) => {
  const parsed = assetId ? parseAssetId(assetId) : null
  const isNative = parsed && !parsed.tokenAddress
  const isErc20 = parsed && !!parsed.tokenAddress

  const nativeChainId = isNative ? (parsed.chainId as SupportedChainId) : undefined
  const erc20ChainId = isErc20 ? (parsed.chainId as SupportedChainId) : undefined

  const {
    data: nativeBalance,
    isLoading: isNativeLoading,
    refetch: refetchNative,
  } = useBalance({
    address: address as `0x${string}` | undefined,
    // @ts-ignore - swap-widget supports more chains than main app's wagmi type registration
    chainId: nativeChainId,
    query: {
      enabled: !!address && !!isNative,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })

  const {
    data: erc20Balance,
    isLoading: isErc20Loading,
    refetch: refetchErc20,
  } = useBalance({
    address: address as `0x${string}` | undefined,
    // @ts-ignore - swap-widget supports more chains than main app's wagmi type registration
    chainId: erc20ChainId,
    token: isErc20 ? parsed.tokenAddress : undefined,
    query: {
      enabled: !!address && !!isErc20,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  })

  const balance = isNative ? nativeBalance : isErc20 ? erc20Balance : undefined
  const isLoading = isNative ? isNativeLoading : isErc20 ? isErc20Loading : false
  const refetch = isNative ? refetchNative : isErc20 ? refetchErc20 : undefined

  return useMemo(() => {
    if (!balance || !assetId) {
      return { data: undefined, isLoading, refetch }
    }

    return {
      data: {
        assetId,
        balance: balance.value.toString(),
        balanceFormatted: formatAmount(balance.value.toString(), precision),
      },
      isLoading,
      refetch,
    }
  }, [balance, assetId, precision, isLoading, refetch])
}

export const useEvmBalances = (
  address: string | undefined,
  assetIds: AssetId[],
  assetPrecisions: Record<AssetId, number>,
) => {
  const config = useConfig()

  const parsedAssets = useMemo(() => {
    return assetIds
      .map(assetId => {
        const parsed = parseAssetId(assetId)
        if (!parsed) return null
        return {
          assetId,
          chainId: parsed.chainId as SupportedChainId,
          tokenAddress: parsed.tokenAddress,
          precision: assetPrecisions[assetId] ?? 18,
          isNative: !parsed.tokenAddress,
        }
      })
      .filter(Boolean) as {
      assetId: AssetId
      chainId: SupportedChainId
      tokenAddress?: `0x${string}`
      precision: number
      isNative: boolean
    }[]
  }, [assetIds, assetPrecisions])

  const nativeAssets = useMemo(() => parsedAssets.filter(a => a.isNative), [parsedAssets])

  const erc20Assets = useMemo(() => parsedAssets.filter(a => !a.isNative), [parsedAssets])

  const nativeQueries = useQueries({
    queries: nativeAssets.map(asset => ({
      queryKey: ['nativeBalance', address, asset.chainId],
      queryFn: () => {
        if (!address) return Promise.resolve(null)
        return balanceQueue.add(async () => {
          try {
            const result = await getBalance(config, {
              address: address as `0x${string}`,
              // @ts-ignore - swap-widget supports more chains than main app's wagmi type registration
              chainId: asset.chainId,
            })
            return {
              assetId: asset.assetId,
              balance: result.value.toString(),
              precision: asset.precision,
            }
          } catch {
            return null
          }
        })
      },
      enabled: !!address,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  })

  const erc20Queries = useQueries({
    queries: erc20Assets.map(asset => ({
      queryKey: ['erc20Balance', address, asset.chainId, asset.tokenAddress],
      queryFn: () => {
        if (!address) return Promise.resolve(null)
        return balanceQueue.add(async () => {
          try {
            if (!asset.tokenAddress) return null
            const result = await readContract(config, {
              address: asset.tokenAddress,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
              // @ts-ignore - swap-widget supports more chains than main app's wagmi type registration
              chainId: asset.chainId,
            })
            return {
              assetId: asset.assetId,
              balance: (result as bigint).toString(),
              precision: asset.precision,
            }
          } catch {
            return null
          }
        })
      },
      enabled: !!address,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  })

  const isErc20Loading = erc20Queries.some(q => q.isLoading)

  const balances = useMemo((): BalancesMap => {
    const result: BalancesMap = {}

    nativeQueries.forEach(query => {
      if (query.data) {
        const { assetId, balance, precision } = query.data
        result[assetId] = {
          assetId,
          balance,
          balanceFormatted: formatAmount(balance, precision),
        }
      }
    })

    erc20Queries.forEach(query => {
      if (query.data) {
        const { assetId, balance, precision } = query.data
        result[assetId] = {
          assetId,
          balance,
          balanceFormatted: formatAmount(balance, precision),
        }
      }
    })

    return result
  }, [nativeQueries, erc20Queries])

  const isLoading = nativeQueries.some(q => q.isLoading) || isErc20Loading

  const loadingAssetIds = useMemo(() => {
    const loading = new Set<AssetId>()
    nativeQueries.forEach((query, index) => {
      if (query.isLoading) {
        loading.add(nativeAssets[index].assetId)
      }
    })
    erc20Queries.forEach((query, index) => {
      if (query.isLoading) {
        loading.add(erc20Assets[index].assetId)
      }
    })
    return loading
  }, [nativeQueries, nativeAssets, erc20Queries, erc20Assets])

  return { data: balances, isLoading, loadingAssetIds }
}
