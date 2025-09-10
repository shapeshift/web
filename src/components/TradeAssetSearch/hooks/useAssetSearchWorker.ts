import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import AssetSearchWorker from '../workers/assetSearch.worker?worker'

import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import type { AssetSearchWorkerOutboundMessage } from '@/lib/assetSearch'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  selectPrimaryAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WorkerState = 'initializing' | 'ready' | 'failed'

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
  const primaryAssets = useAppSelector(
    selectPrimaryAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  )
  const assets = useAppSelector(
    selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  )

  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 200)
  const [workerSearchState, setWorkerSearchState] = useState<WorkerSearchState>({
    workerState: 'initializing',
    searchResults: null,
    requestId: 0,
    isSearching: false,
  })

  useEffect(() => {
    if (workerRef.current) return

    try {
      const worker = new AssetSearchWorker()
      workerRef.current = worker

      worker.onmessage = (event: MessageEvent<AssetSearchWorkerOutboundMessage>) => {
        const { type, requestId, payload } = event.data
        if (type !== 'searchResult') return
        if (requestId !== requestIdRef.current) return

        setWorkerSearchState(prev => ({
          ...prev,
          workerState: 'ready',
          searchResults: payload.assetIds,
          isSearching: false,
        }))
      }

      worker.onerror = error => {
        console.error('Worker error:', error)
        setWorkerSearchState(prev => ({ ...prev, workerState: 'failed' }))
      }
    } catch (error) {
      console.error('Failed to initialize worker:', error)
      setWorkerSearchState(prev => ({ ...prev, workerState: 'failed' }))
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Update worker with new assets
  useEffect(() => {
    if (workerRef.current && primaryAssets.length && assets.length) {
      workerRef.current.postMessage({
        type: 'updateAssets',
        payload: { assets },
      })
      workerRef.current.postMessage({
        type: 'updatePrimaryAssets',
        payload: {
          assets: primaryAssets,
        },
      })
      setWorkerSearchState(prev => ({ ...prev, workerState: 'ready' }))
    } else {
      setWorkerSearchState(prev => ({ ...prev, workerState: 'initializing' }))
    }
  }, [assets, primaryAssets])

  // Event-driven search function
  const performSearch = useCallback(
    (searchTerm: string) => {
      const worker = workerRef.current

      if (!worker || workerSearchState.workerState !== 'ready') {
        return
      }

      if (!searchTerm) {
        setWorkerSearchState(prev => ({ ...prev, searchResults: null, isSearching: false }))
        return
      }

      const nextRequestId = requestIdRef.current + 1
      requestIdRef.current = nextRequestId

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
        setWorkerSearchState(prev => ({ ...prev, isSearching: true, searchResults: null }))
      } else {
        setWorkerSearchState(prev => ({ ...prev, isSearching: false, searchResults: null }))
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
