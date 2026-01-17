import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Connection } from '@solana/web3.js'

import {
  checkTransactionStatus,
  type ChainType,
  type TransactionStatus,
  type TransactionStatusResult,
} from '../services/transactionStatus'

export type UseTransactionStatusParams = {
  txHash: string | undefined
  chainType: ChainType
  chainId?: number
  connection?: Connection
  network?: 'mainnet' | 'testnet'
  enabled?: boolean
  pollInterval?: number
  stopOnConfirmed?: boolean
}

export type UseTransactionStatusResult = {
  status: TransactionStatus | undefined
  confirmations: number | undefined
  blockNumber: number | undefined
  error: string | undefined
  isLoading: boolean
  isPolling: boolean
  refetch: () => void
  stop: () => void
}

const DEFAULT_POLL_INTERVALS: Record<ChainType, number> = {
  evm: 3000,
  utxo: 30000,
  solana: 2000,
}

export const useTransactionStatus = (
  params: UseTransactionStatusParams,
): UseTransactionStatusResult => {
  const {
    txHash,
    chainType,
    chainId,
    connection,
    network = 'mainnet',
    enabled = true,
    pollInterval,
    stopOnConfirmed = true,
  } = params

  const [isPolling, setIsPolling] = useState(false)
  const [shouldStop, setShouldStop] = useState(false)

  const queryClient = useQueryClient()

  const effectivePollInterval = pollInterval ?? DEFAULT_POLL_INTERVALS[chainType]

  const queryKey = useMemo(
    () => ['transactionStatus', txHash, chainType, chainId, network],
    [txHash, chainType, chainId, network],
  )

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<TransactionStatusResult> => {
      if (!txHash) {
        return { status: 'pending' }
      }

      setIsPolling(true)

      const result = await checkTransactionStatus({
        txHash,
        chainType,
        chainId,
        connection,
        network,
      })

      return result
    },
    enabled: enabled && !!txHash && !shouldStop,
    refetchInterval: (query) => {
      const currentData = query.state.data
      if (!currentData) return effectivePollInterval
      if (shouldStop) return false
      if (stopOnConfirmed && currentData.status === 'confirmed') return false
      if (currentData.status === 'failed') return false
      return effectivePollInterval
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (data?.status === 'confirmed' || data?.status === 'failed') {
      setIsPolling(false)
    }
  }, [data?.status])

  useEffect(() => {
    setShouldStop(false)
    setIsPolling(false)
  }, [txHash])

  const stop = useCallback(() => {
    setShouldStop(true)
    setIsPolling(false)
  }, [])

  const handleRefetch = useCallback(() => {
    setShouldStop(false)
    refetch()
  }, [refetch])

  return useMemo(
    () => ({
      status: data?.status,
      confirmations: data?.confirmations,
      blockNumber: data?.blockNumber,
      error: data?.error,
      isLoading,
      isPolling: isPolling && !shouldStop && data?.status === 'pending',
      refetch: handleRefetch,
      stop,
    }),
    [data, isLoading, isPolling, shouldStop, handleRefetch, stop],
  )
}

export type TransactionWatcherState = {
  status: 'idle' | 'pending' | 'success' | 'error'
  txHash?: string
  message?: string
  confirmations?: number
}

export type UseTransactionWatcherParams = {
  chainType: ChainType
  chainId?: number
  connection?: Connection
  network?: 'mainnet' | 'testnet'
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
}

export const useTransactionWatcher = (params: UseTransactionWatcherParams) => {
  const { chainType, chainId, connection, network, onSuccess, onError } = params

  const [state, setState] = useState<TransactionWatcherState>({ status: 'idle' })

  const statusResult = useTransactionStatus({
    txHash: state.txHash,
    chainType,
    chainId,
    connection,
    network,
    enabled: !!state.txHash && state.status === 'pending',
    stopOnConfirmed: true,
  })

  useEffect(() => {
    if (!state.txHash || state.status !== 'pending') return

    if (statusResult.status === 'confirmed') {
      setState(prev => ({
        ...prev,
        status: 'success',
        message: 'Transaction confirmed!',
        confirmations: statusResult.confirmations,
      }))
      onSuccess?.(state.txHash)
    } else if (statusResult.status === 'failed') {
      setState(prev => ({
        ...prev,
        status: 'error',
        message: statusResult.error ?? 'Transaction failed',
      }))
      onError?.(new Error(statusResult.error ?? 'Transaction failed'))
    }
  }, [statusResult.status, statusResult.confirmations, statusResult.error, state.txHash, state.status, onSuccess, onError])

  const startWatching = useCallback((txHash: string, initialMessage?: string) => {
    setState({
      status: 'pending',
      txHash,
      message: initialMessage ?? 'Waiting for confirmation...',
    })
  }, [])

  const reset = useCallback(() => {
    setState({ status: 'idle' })
    statusResult.stop()
  }, [statusResult])

  const setError = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      status: 'error',
      message,
    }))
  }, [])

  return useMemo(
    () => ({
      state,
      isWatching: state.status === 'pending',
      isPolling: statusResult.isPolling,
      startWatching,
      reset,
      setError,
    }),
    [state, statusResult.isPolling, startWatching, reset, setError],
  )
}
