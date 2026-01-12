import type { SortingState } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SortOption } from '@/pages/Yields/components/YieldFilters'

export const useYieldFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'apy', desc: true }])

  const selectedNetwork = useMemo(() => searchParams.get('network'), [searchParams])
  const selectedProvider = useMemo(() => searchParams.get('provider'), [searchParams])
  const sortOption = useMemo(
    () => (searchParams.get('sort') as SortOption) || 'apy-desc',
    [searchParams],
  )

  const handleNetworkChange = useCallback(
    (network: string | null) => {
      setSearchParams(prev => {
        if (!network) prev.delete('network')
        else prev.set('network', network)
        return prev
      })
    },
    [setSearchParams],
  )

  const handleProviderChange = useCallback(
    (provider: string | null) => {
      setSearchParams(prev => {
        if (!provider) prev.delete('provider')
        else prev.set('provider', provider)
        return prev
      })
    },
    [setSearchParams],
  )

  const handleSortChange = useCallback(
    (option: SortOption) => {
      setSearchParams(prev => {
        prev.set('sort', option)
        return prev
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    switch (sortOption) {
      case 'apy-desc':
        setSorting([{ id: 'apy', desc: true }])
        break
      case 'apy-asc':
        setSorting([{ id: 'apy', desc: false }])
        break
      case 'tvl-desc':
        setSorting([{ id: 'tvl', desc: true }])
        break
      case 'tvl-asc':
        setSorting([{ id: 'tvl', desc: false }])
        break
      case 'name-asc':
        setSorting([{ id: 'pool', desc: false }])
        break
      case 'name-desc':
        setSorting([{ id: 'pool', desc: true }])
        break
      default:
        break
    }
  }, [sortOption])

  return {
    selectedNetwork,
    selectedProvider,
    sortOption,
    sorting,
    setSorting,
    handleNetworkChange,
    handleProviderChange,
    handleSortChange,
  }
}
