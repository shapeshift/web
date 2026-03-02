import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import { ASSET_NAMESPACE, CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { Connection, PublicKey } from '@solana/web3.js'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { getBalance, readContract } from '@wagmi/core'
import PQueue from 'p-queue'
import { useCallback, useMemo } from 'react'
import { erc20Abi } from 'viem'
import { useConfig } from 'wagmi'

import type { SupportedChainId } from '../config/wagmi'
import type { AssetId } from '../types'
import { formatAmount, getChainType, UTXO_CHAIN_IDS } from '../types'

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
const SOLANA_PUBLIC_RPC = 'https://api.mainnet-beta.solana.com'

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
  const confirmedFunded = data.chain_stats?.funded_txo_sum ?? 0
  const confirmedSpent = data.chain_stats?.spent_txo_sum ?? 0
  const mempoolFunded = data.mempool_stats?.funded_txo_sum ?? 0
  const mempoolSpent = data.mempool_stats?.spent_txo_sum ?? 0
  const totalBalance = confirmedFunded - confirmedSpent + (mempoolFunded - mempoolSpent)

  return totalBalance.toString()
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
      return {
        data: undefined,
        isLoading: queryResult?.isLoading ?? false,
        refetch: queryResult?.refetch,
      }
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
  const { connection: walletConnection } = useAppKitConnection()
  const parsed = assetId ? parseAssetIdMultiChain(assetId) : null
  const isSolana = parsed?.chainType === 'solana'
  const isNative = isSolana && !('tokenAddress' in parsed && parsed.tokenAddress)
  const tokenAddress = isSolana && 'tokenAddress' in parsed ? parsed.tokenAddress : undefined

  const query = useQueries({
    queries: [
      {
        queryKey: ['solanaBalance', address, assetId, isNative],
        queryFn: async () => {
          if (!address || !assetId || !isSolana) return null

          const connection = walletConnection ?? new Connection(SOLANA_PUBLIC_RPC, 'confirmed')

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
        enabled: !!address && !!assetId && isSolana,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    ],
  })

  return useMemo(() => {
    const queryResult = query[0]
    if (!queryResult?.data || !assetId) {
      return {
        data: undefined,
        isLoading: queryResult?.isLoading ?? false,
        refetch: queryResult?.refetch,
      }
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
  const config = useConfig()

  const addressForChain =
    chainType === 'evm'
      ? evmAddress
      : chainType === 'utxo'
      ? utxoAddress
      : chainType === 'solana'
      ? solanaAddress
      : undefined

  const evmParsed = chainType === 'evm' && parsed?.chainType === 'evm' ? parsed : null
  const isErc20 = evmParsed && evmParsed.tokenAddress

  const evmQuery = useQueries({
    queries: [
      {
        queryKey: [
          'singleEvmBalance',
          evmAddress,
          assetId,
          evmParsed?.evmChainId,
          evmParsed?.tokenAddress,
        ],
        queryFn: async () => {
          if (!evmAddress || !assetId || !evmParsed) return null
          try {
            if (isErc20 && evmParsed.tokenAddress) {
              const result = await readContract(config, {
                address: evmParsed.tokenAddress,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [evmAddress as `0x${string}`],
                chainId: evmParsed.evmChainId,
              })
              return {
                assetId,
                balance: (result as bigint).toString(),
                precision,
              }
            }
            const result = await getBalance(config, {
              address: evmAddress as `0x${string}`,
              // @ts-ignore
              chainId: evmParsed.evmChainId,
            })
            return {
              assetId,
              balance: result.value.toString(),
              precision,
            }
          } catch {
            return null
          }
        },
        enabled: chainType === 'evm' && !!evmAddress && !!assetId,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    ],
  })

  const evmBalance = useMemo(() => {
    const queryResult = evmQuery[0]
    if (!queryResult?.data || !assetId) {
      return {
        data: undefined,
        isLoading: queryResult?.isLoading ?? false,
        refetch: queryResult?.refetch,
      }
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
  }, [evmQuery, assetId, precision])

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
  const { connection: walletConnection } = useAppKitConnection()
  const queryClient = useQueryClient()

  const groupedAssets = useMemo(() => {
    const evm: {
      assetId: AssetId
      chainId: number
      tokenAddress?: `0x${string}`
      precision: number
    }[] = []
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
      } else if (
        parsed?.chainType === 'utxo' &&
        parsed.chainReference === UTXO_CHAIN_IDS.bitcoin.split(':')[1]
      ) {
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
        if (!solanaAddress) return null

        const connection = walletConnection ?? new Connection(SOLANA_PUBLIC_RPC, 'confirmed')

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
      enabled: !!solanaAddress,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  })

  const balances = useMemo((): BalancesMap => {
    const result: BalancesMap = {}

    ;[...evmQueries, ...utxoQueries, ...solanaQueries].forEach(query => {
      if (query.data) {
        const { assetId, balance, precision } = query.data
        const formatted = formatAmount(balance, precision)
        result[assetId] = {
          assetId,
          balance,
          balanceFormatted: formatted,
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

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: query => {
        const key = query.queryKey
        return (
          (Array.isArray(key) && key[0] === 'multiChainBalance') ||
          key[0] === 'nativeBalance' ||
          key[0] === 'erc20Balance' ||
          key[0] === 'utxoBalance' ||
          key[0] === 'solanaBalance'
        )
      },
    })
  }, [queryClient])

  const refetchSpecific = useCallback(
    (targetAssetIds: AssetId[]) => {
      queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey as unknown[]
          if (!Array.isArray(key) || key[0] !== 'multiChainBalance') return false

          return targetAssetIds.some(assetId => {
            const evmAsset = groupedAssets.evm.find(a => a.assetId === assetId)
            if (evmAsset) {
              const expectedKey = [
                'multiChainBalance',
                'evm',
                evmAddress,
                evmAsset.chainId,
                evmAsset.tokenAddress,
              ]
              if (
                key.length === expectedKey.length &&
                key.every((val, idx) => val === expectedKey[idx])
              ) {
                return true
              }
            }

            const utxoAsset = groupedAssets.utxo.find(a => a.assetId === assetId)
            if (utxoAsset) {
              const expectedKey = ['multiChainBalance', 'utxo', utxoAddress, assetId]
              if (
                key.length === expectedKey.length &&
                key.every((val, idx) => val === expectedKey[idx])
              ) {
                return true
              }
            }

            const solanaAsset = groupedAssets.solana.find(a => a.assetId === assetId)
            if (solanaAsset) {
              const expectedKey = [
                'multiChainBalance',
                'solana',
                solanaAddress,
                assetId,
                solanaAsset.tokenAddress,
              ]
              if (
                key.length === expectedKey.length &&
                key.every((val, idx) => val === expectedKey[idx])
              ) {
                return true
              }
            }

            return false
          })
        },
      })
    },
    [queryClient, groupedAssets, evmAddress, utxoAddress, solanaAddress],
  )

  return { data: balances, isLoading, loadingAssetIds, refetch, refetchSpecific }
}
