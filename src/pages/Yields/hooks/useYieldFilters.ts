import type { OnChangeFn, SortingState, Updater } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SortOption } from '@/pages/Yields/components/YieldFilters'

const getSortingFromOption = (sortOption: SortOption): SortingState => {
  switch (sortOption) {
    case 'apy-desc':
      return [{ id: 'apy', desc: true }]
    case 'apy-asc':
      return [{ id: 'apy', desc: false }]
    case 'tvl-desc':
      return [{ id: 'tvl', desc: true }]
    case 'tvl-asc':
      return [{ id: 'tvl', desc: false }]
    case 'name-asc':
      return [{ id: 'pool', desc: false }]
    case 'name-desc':
      return [{ id: 'pool', desc: true }]
    default:
      return [{ id: 'apy', desc: true }]
  }
}

export const useYieldFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedNetwork = useMemo(() => searchParams.get('network'), [searchParams])
  const selectedProvider = useMemo(() => searchParams.get('provider'), [searchParams])
  const selectedType = useMemo(() => searchParams.get('type'), [searchParams])
  const sortOption = useMemo(
    () => (searchParams.get('sort') as SortOption) || 'apy-desc',
    [searchParams],
  )

  const sorting = useMemo(() => getSortingFromOption(sortOption), [sortOption])

  const setSorting: OnChangeFn<SortingState> = useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue
      const sort = newSorting[0]
      if (!sort) return
      const option = `${sort.id === 'pool' ? 'name' : sort.id}-${
        sort.desc ? 'desc' : 'asc'
      }` as SortOption
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('sort', option)
        return next
      })
    },
    [setSearchParams, sorting],
  )

  const handleNetworkChange = useCallback(
    (network: string | null) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (!network) next.delete('network')
        else next.set('network', network)
        return next
      })
    },
    [setSearchParams],
  )

  const handleProviderChange = useCallback(
    (provider: string | null) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (!provider) next.delete('provider')
        else next.set('provider', provider)
        return next
      })
    },
    [setSearchParams],
  )

  const handleTypeChange = useCallback(
    (type: string | null) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (!type) next.delete('type')
        else next.set('type', type)
        return next
      })
    },
    [setSearchParams],
  )

  const handleSortChange = useCallback(
    (option: SortOption) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('sort', option)
        return next
      })
    },
    [setSearchParams],
  )

  return {
    selectedNetwork,
    selectedProvider,
    selectedType,
    sortOption,
    sorting,
    setSorting,
    handleNetworkChange,
    handleProviderChange,
    handleTypeChange,
    handleSortChange,
  }
}
