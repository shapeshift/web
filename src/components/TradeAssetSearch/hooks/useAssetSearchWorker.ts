import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import AssetSearchWorker from '../workers/assetSearch.worker?worker'

import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import type { AssetSearchWorkerOutboundMessage, SearchableAsset } from '@/lib/assetSearch'
import { profiler } from '@/lib/performanceProfiler'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WorkerState = 'initializing' | 'ready' | 'failed'

let sharedWorker: Worker | null = null
let postedAssets: unknown[] | null = null
let lastRequestId = 0

const getSharedWorker = () => {
  if (sharedWorker) return sharedWorker

  const worker = new AssetSearchWorker()
  worker.addEventListener('error', () => {
    worker.terminate()
    if (sharedWorker !== worker) return
    sharedWorker = null
    postedAssets = null
  })
  sharedWorker = worker
  return worker
}

export type WorkerSearchState = {
  workerState: WorkerState
  searchResults: AssetId[] | null
  requestId: number
  isSearching: boolean
}

export interface UseAssetSearchWorkerProps {
  activeChainId: ChainId | 'All'
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds?: ChainId[]
  hasWallet: boolean
}

export const useAssetSearchWorker = ({
  activeChainId,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  hasWallet,
}: UseAssetSearchWorkerProps) => {
  const assets = useAppSelector(
    selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  )

  const requestIdRef = useRef(0)
  const searchStartTimeRef = useRef<Map<number, { startTime: number; query: string }>>(new Map())
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 200)
  const [workerSearchState, setWorkerSearchState] = useState<WorkerSearchState>({
    workerState: 'initializing',
    searchResults: null,
    requestId: 0,
    isSearching: false,
  })

  useEffect(() => {
    let worker: Worker
    try {
      worker = getSharedWorker()
    } catch (error) {
      console.error('Failed to initialize worker:', error)
      setWorkerSearchState(prev => ({ ...prev, workerState: 'failed' }))
      return
    }

    const handleMessage = (event: MessageEvent<AssetSearchWorkerOutboundMessage>) => {
      const { type, requestId, payload } = event.data
      if (type !== 'searchResult') return
      if (requestId !== requestIdRef.current) {
        searchStartTimeRef.current.delete(requestId)
        return
      }

      const searchInfo = searchStartTimeRef.current.get(requestId)
      if (searchInfo) {
        const duration = performance.now() - searchInfo.startTime
        profiler.trackAssetSearch(searchInfo.query, duration)
        searchStartTimeRef.current.delete(requestId)
      }

      setWorkerSearchState(prev => ({
        ...prev,
        workerState: 'ready',
        searchResults: payload.assetIds,
        isSearching: false,
      }))
    }

    const handleError = (error: ErrorEvent) => {
      console.error('Worker error:', error)
      setWorkerSearchState(prev => ({ ...prev, workerState: 'failed' }))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)

    return () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
    }
  }, [])

  // Update worker with new assets
  useEffect(() => {
    if (!assets.length) {
      setWorkerSearchState(prev => ({ ...prev, workerState: 'initializing' }))
      return
    }
    if (!sharedWorker) return

    if (postedAssets !== assets) {
      const searchableAssets: SearchableAsset[] = assets.map(
        ({ assetId, name, symbol, chainId, isPrimary, relatedAssetKey }) => ({
          assetId,
          name,
          symbol,
          chainId,
          isPrimary,
          relatedAssetKey,
        }),
      )
      sharedWorker.postMessage({ type: 'updateAssets', payload: { assets: searchableAssets } })
      postedAssets = assets
    }
    setWorkerSearchState(prev => ({ ...prev, workerState: 'ready' }))
  }, [assets])

  // Event-driven search function
  const performSearch = useCallback(
    (searchTerm: string) => {
      const worker = sharedWorker

      if (!worker || workerSearchState.workerState !== 'ready') {
        return
      }

      if (!searchTerm) {
        setWorkerSearchState(prev => ({
          ...prev,
          searchResults: null,
          isSearching: false,
        }))
        return
      }

      const nextRequestId = ++lastRequestId
      requestIdRef.current = nextRequestId
      searchStartTimeRef.current.clear()
      searchStartTimeRef.current.set(nextRequestId, {
        startTime: performance.now(),
        query: searchTerm,
      })

      setWorkerSearchState(prev => ({
        ...prev,
        requestId: nextRequestId,
        isSearching: true,
        searchResults: null,
      }))

      worker.postMessage({
        type: 'search',
        requestId: nextRequestId,
        payload: {
          searchString: searchTerm,
          activeChainId,
          allowWalletUnsupportedAssets: !hasWallet || allowWalletUnsupportedAssets,
          walletConnectedChainIds,
        },
      })
    },
    [
      activeChainId,
      hasWallet,
      allowWalletUnsupportedAssets,
      walletConnectedChainIds,
      workerSearchState.workerState,
    ],
  )

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newSearchString = e.target.value
      setSearchString(newSearchString)

      if (workerSearchState.workerState === 'failed') return

      if (newSearchString.trim()) {
        setWorkerSearchState(prev => ({
          ...prev,
          isSearching: true,
          searchResults: null,
        }))
      } else {
        setWorkerSearchState(prev => ({
          ...prev,
          isSearching: false,
          searchResults: null,
        }))
      }
    },
    [workerSearchState.workerState],
  )

  // Trigger search when debounced value changes
  useEffect(() => {
    performSearch(debouncedSearchString.trim())
  }, [debouncedSearchString, performSearch])

  return {
    searchString,
    workerSearchState,
    handleSearchChange,
  }
}
