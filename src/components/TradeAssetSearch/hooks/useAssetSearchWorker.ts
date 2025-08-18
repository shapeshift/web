import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import pick from 'lodash/pick'
import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import AssetSearchWorker from '../workers/assetSearch.worker?worker'

import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import type { AssetSearchWorkerOutboundMessage } from '@/lib/assetSearch'

type WorkerState = 'initializing' | 'ready' | 'failed'

export type WorkerSearchState = {
  workerState: WorkerState
  searchResults: AssetId[] | null
  requestId: number
  isSearching: boolean
}

export interface UseAssetSearchWorkerProps {
  assets: Asset[]
  activeChainId: ChainId | 'All'
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  hasWallet: boolean
}

export const useAssetSearchWorker = ({
  assets,
  activeChainId,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  hasWallet,
}: UseAssetSearchWorkerProps) => {
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

  // Initialize worker when assets are available
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (workerRef.current) return
    if (!assets.length) return

    try {
      const worker = new AssetSearchWorker()
      workerRef.current = worker

      worker.postMessage({
        type: 'init',
        payload: { assets: assets.map(a => pick(a, ['assetId', 'name', 'symbol', 'chainId'])) },
      })

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

      setWorkerSearchState(prev => ({ ...prev, workerState: 'ready' }))
    } catch {
      setWorkerSearchState(prev => ({ ...prev, workerState: 'failed' }))
    }
  }, [assets])

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

      // Set searching immediately if there's a search term, clear if empty
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
    setSearchString,
    workerSearchState,
    handleSearchChange,
  }
}
