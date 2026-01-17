import { ASSET_NAMESPACE, CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useQueries } from '@tanstack/react-query'
import { getBalance, readContract } from '@wagmi/core'
import { PublicKey } from '@solana/web3.js'
import PQueue from 'p-queue'
import { useMemo } from 'react'
import { erc20Abi } from 'viem'
import { useBalance, useConfig } from 'wagmi'

import type { SupportedChainId } from '../config/wagmi'
import type { AssetId } from '../types'
import { formatAmount, getChainType } from '../types'

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

type ChainTypeResult = 'evm' | 'utxo' | 'solana' | 'other'

type ParsedAssetEvm = {
  chainType: 'evm'
  evmChainId: number
  tokenAddress?: `0x${string}`
}

type ParsedAssetUtxo = {
  chainType: 'utxo'
  chainReference: string
}

type ParsedAssetSolana = {
  chainType: 'solana'
  tokenAddress?: string
}

type ParsedAsset = ParsedAssetEvm | ParsedAssetUtxo | ParsedAssetSolana | null

const MEMPOOL_API_BASE = 'https://mempool.space/api'

const parseAssetIdMultiChain = (assetId: AssetId): ParsedAsset => {
  try {
    const { chainNamespace, chainReference, assetNamespace, assetReference } = fromAssetId(assetId)
    const chainType = getChainType(assetId.split('/')[0] as string)

    if (chainType === 'evm' && chainNamespace === CHAIN_NAMESPACE.Evm) {
      const evmChainId = Number(chainReference)
      if (assetNamespace === ASSET_NAMESPACE.erc20) {
        return {
          chainType: 'evm',
          evmChainId,
          tokenAddress: assetReference as `0x${string}`,
        }
      }
      return { chainType: 'evm', evmChainId }
    }

    if (chainType === 'utxo' && chainNamespace === CHAIN_NAMESPACE.Utxo) {
      return { chainType: 'utxo', chainReference }
    }

    if (chainType === 'solana' && chainNamespace === CHAIN_NAMESPACE.Solana) {
      if (assetNamespace === ASSET_NAMESPACE.splToken) {
        return { chainType: 'solana', tokenAddress: assetReference }
      }
      return { chainType: 'solana' }
    }

    return null
  } catch {
    return null
  }
}

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

const fetchBitcoinBalance = async (
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet',
): Promise<string> => {
  const baseUrl = network === 'testnet' ? 'https://mempool.space/testnet/api' : MEMPOOL_API_BASE

  const response = await fetch(`${baseUrl}/address/${address}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch Bitcoin balance: ${response.status}`)
  }

  const data = await response.json()
  const confirmedBalance = data.chain_stats?.funded_txo_sum - data.chain_stats?.spent_txo_sum
  const mempoolBalance = data.mempool_stats?.funded_txo_sum - data.mempool_stats?.spent_txo_sum
  const totalBalance = (confirmedBalance ?? 0) + (mempoolBalance ?? 0)

  return totalBalance.toString()
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

export const useBitcoinBalance = (
  address: string | undefined,
  assetId: AssetId | undefined,
  precision: number = 8,
) => {
  const parsed = assetId ? parseAssetIdMultiChain(assetId) : null
  const isUtxo = parsed?.chainType === 'utxo'

  const query = useQueries({
    queries: [
      {
        queryKey: ['utxoBalance', address, assetId],
        queryFn: async () => {
          if (!address || !assetId || !isUtxo) return null
          try {
            const balance = await fetchBitcoinBalance(address)
            return {
              assetId,
              balance,
              precision,
            }
          } catch {
            return null
          }
        },
        enabled: !!address && !!assetId && isUtxo,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    ],
  })

  return useMemo(() => {
    const queryResult = query[0]
    if (!queryResult?.data || !assetId) {
      return { data: undefined, isLoading: queryResult?.isLoading ?? false, refetch: queryResult?.refetch }
    }

    const { balance } = queryResult.data
    return {
      data: {
        assetId,
        balance,
        balanceFormatted: formatAmount(balance, precision),
      },
      isLoading: queryResult.isLoading,
      refetch: queryResult.refetch,
    }
  }, [query, assetId, precision])
}

export const useSolanaBalance = (
  address: string | undefined,
  assetId: AssetId | undefined,
  precision: number = 9,
) => {
  const { connection } = useAppKitConnection()
  const parsed = assetId ? parseAssetIdMultiChain(assetId) : null
  const isSolana = parsed?.chainType === 'solana'
  const isNative = isSolana && !('tokenAddress' in parsed && parsed.tokenAddress)
  const tokenAddress = isSolana && 'tokenAddress' in parsed ? parsed.tokenAddress : undefined

  const query = useQueries({
    queries: [
      {
        queryKey: ['solanaBalance', address, assetId, isNative],
        queryFn: async () => {
          if (!address || !assetId || !isSolana || !connection) return null

          try {
            const pubKey = new PublicKey(address)

            if (isNative) {
              const balance = await connection.getBalance(pubKey)
              return {
                assetId,
                balance: balance.toString(),
                precision,
              }
            }

            if (tokenAddress) {
              const tokenPubKey = new PublicKey(tokenAddress)
              const tokenAccounts = await connection.getTokenAccountsByOwner(pubKey, {
                mint: tokenPubKey,
              })

              if (tokenAccounts.value.length === 0) {
                return {
                  assetId,
                  balance: '0',
                  precision,
                }
              }

              const accountInfo = tokenAccounts.value[0].account.data
              const balance = accountInfo.slice(64, 72).readBigUInt64LE()
              return {
                assetId,
                balance: balance.toString(),
                precision,
              }
            }

            return null
          } catch {
            return null
          }
        },
        enabled: !!address && !!assetId && isSolana && !!connection,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    ],
  })

  return useMemo(() => {
    const queryResult = query[0]
    if (!queryResult?.data || !assetId) {
      return { data: undefined, isLoading: queryResult?.isLoading ?? false, refetch: queryResult?.refetch }
    }

    const { balance } = queryResult.data
    return {
      data: {
        assetId,
        balance,
        balanceFormatted: formatAmount(balance, precision),
      },
      isLoading: queryResult.isLoading,
      refetch: queryResult.refetch,
    }
  }, [query, assetId, precision])
}

export const useMultiChainBalance = (
  evmAddress: string | undefined,
  utxoAddress: string | undefined,
  solanaAddress: string | undefined,
  assetId: AssetId | undefined,
  precision: number = 18,
) => {
  const parsed = assetId ? parseAssetIdMultiChain(assetId) : null
  const chainType = parsed?.chainType ?? 'other'

  const addressForChain =
    chainType === 'evm'
      ? evmAddress
      : chainType === 'utxo'
        ? utxoAddress
        : chainType === 'solana'
          ? solanaAddress
          : undefined

  const evmBalance = useAssetBalance(
    chainType === 'evm' ? addressForChain : undefined,
    chainType === 'evm' ? assetId : undefined,
    precision,
  )

  const utxoBalance = useBitcoinBalance(
    chainType === 'utxo' ? addressForChain : undefined,
    chainType === 'utxo' ? assetId : undefined,
    precision,
  )

  const solanaBalance = useSolanaBalance(
    chainType === 'solana' ? addressForChain : undefined,
    chainType === 'solana' ? assetId : undefined,
    precision,
  )

  return useMemo(() => {
    switch (chainType) {
      case 'evm':
        return evmBalance
      case 'utxo':
        return utxoBalance
      case 'solana':
        return solanaBalance
      default:
        return { data: undefined, isLoading: false, refetch: undefined }
    }
  }, [chainType, evmBalance, utxoBalance, solanaBalance])
}

export const useMultiChainBalances = (
  evmAddress: string | undefined,
  utxoAddress: string | undefined,
  solanaAddress: string | undefined,
  assetIds: AssetId[],
  assetPrecisions: Record<AssetId, number>,
) => {
  const config = useConfig()
  const { connection } = useAppKitConnection()

  const groupedAssets = useMemo(() => {
    const evm: { assetId: AssetId; chainId: number; tokenAddress?: `0x${string}`; precision: number }[] = []
    const utxo: { assetId: AssetId; precision: number }[] = []
    const solana: { assetId: AssetId; tokenAddress?: string; precision: number }[] = []

    assetIds.forEach(assetId => {
      const parsed = parseAssetIdMultiChain(assetId)
      const precision = assetPrecisions[assetId] ?? 18

      if (parsed?.chainType === 'evm') {
        evm.push({
          assetId,
          chainId: parsed.evmChainId,
          tokenAddress: parsed.tokenAddress,
          precision,
        })
      } else if (parsed?.chainType === 'utxo') {
        utxo.push({ assetId, precision })
      } else if (parsed?.chainType === 'solana') {
        solana.push({
          assetId,
          tokenAddress: parsed.tokenAddress,
          precision,
        })
      }
    })

    return { evm, utxo, solana }
  }, [assetIds, assetPrecisions])

  const evmQueries = useQueries({
    queries: groupedAssets.evm.map(asset => ({
      queryKey: ['multiChainBalance', 'evm', evmAddress, asset.chainId, asset.tokenAddress],
      queryFn: async () => {
        if (!evmAddress) return null
        try {
          if (asset.tokenAddress) {
            const result = await readContract(config, {
              address: asset.tokenAddress,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [evmAddress as `0x${string}`],
              // @ts-ignore - swap-widget supports more chains than main app's wagmi type registration
              chainId: asset.chainId,
            })
            return {
              assetId: asset.assetId,
              balance: (result as bigint).toString(),
              precision: asset.precision,
            }
          }
          const result = await getBalance(config, {
            address: evmAddress as `0x${string}`,
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
      },
      enabled: !!evmAddress,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  })

  const utxoQueries = useQueries({
    queries: groupedAssets.utxo.map(asset => ({
      queryKey: ['multiChainBalance', 'utxo', utxoAddress, asset.assetId],
      queryFn: async () => {
        if (!utxoAddress) return null
        try {
          const balance = await fetchBitcoinBalance(utxoAddress)
          return {
            assetId: asset.assetId,
            balance,
            precision: asset.precision,
          }
        } catch {
          return null
        }
      },
      enabled: !!utxoAddress,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  })

  const solanaQueries = useQueries({
    queries: groupedAssets.solana.map(asset => ({
      queryKey: ['multiChainBalance', 'solana', solanaAddress, asset.assetId, asset.tokenAddress],
      queryFn: async () => {
        if (!solanaAddress || !connection) return null
        try {
          const pubKey = new PublicKey(solanaAddress)

          if (!asset.tokenAddress) {
            const balance = await connection.getBalance(pubKey)
            return {
              assetId: asset.assetId,
              balance: balance.toString(),
              precision: asset.precision,
            }
          }

          const tokenPubKey = new PublicKey(asset.tokenAddress)
          const tokenAccounts = await connection.getTokenAccountsByOwner(pubKey, {
            mint: tokenPubKey,
          })

          if (tokenAccounts.value.length === 0) {
            return {
              assetId: asset.assetId,
              balance: '0',
              precision: asset.precision,
            }
          }

          const accountInfo = tokenAccounts.value[0].account.data
          const balance = accountInfo.slice(64, 72).readBigUInt64LE()
          return {
            assetId: asset.assetId,
            balance: balance.toString(),
            precision: asset.precision,
          }
        } catch {
          return null
        }
      },
      enabled: !!solanaAddress && !!connection,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  })

  const balances = useMemo((): BalancesMap => {
    const result: BalancesMap = {}

    ;[...evmQueries, ...utxoQueries, ...solanaQueries].forEach(query => {
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
  }, [evmQueries, utxoQueries, solanaQueries])

  const isLoading =
    evmQueries.some(q => q.isLoading) ||
    utxoQueries.some(q => q.isLoading) ||
    solanaQueries.some(q => q.isLoading)

  const loadingAssetIds = useMemo(() => {
    const loading = new Set<AssetId>()

    evmQueries.forEach((query, index) => {
      if (query.isLoading) {
        loading.add(groupedAssets.evm[index].assetId)
      }
    })
    utxoQueries.forEach((query, index) => {
      if (query.isLoading) {
        loading.add(groupedAssets.utxo[index].assetId)
      }
    })
    solanaQueries.forEach((query, index) => {
      if (query.isLoading) {
        loading.add(groupedAssets.solana[index].assetId)
      }
    })

    return loading
  }, [evmQueries, utxoQueries, solanaQueries, groupedAssets])

  return { data: balances, isLoading, loadingAssetIds }
}
