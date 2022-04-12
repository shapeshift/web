import { useState } from 'react'

type TransactionFilterType = {
  fromDate: number | null
  toDate: number | null
  types: string[] | null
}

const initialState = {
  fromDate: null,
  toDate: null,
  types: null,
}

export const useFilters = () => {
  const [filters, setFilters] = useState<TransactionFilterType>(initialState)

  const resetFilters = () => setFilters(initialState)

  return {
    filters,
    setFilters,
    resetFilters,
  }
}
