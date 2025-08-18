import type { Asset } from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useMemo, useState } from 'react'

import { searchAssets } from '@/lib/assetSearch'
import { isSome } from '@/lib/utils'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useSearch = () => {
  const assetsById = useAppSelector(selectAssets)
  const assets = useMemo(() => Object.values(assetsById).filter(isSome), [assetsById])
  const [searchTerm, setSearchTerm] = useState('')
  const [matchingAssets, setMatchingAssets] = useState<Asset[] | null>(null)
  const handleInputChange = useCallback(
    (inputValue: string) => {
      setSearchTerm(inputValue)
      if (inputValue === '') {
        setMatchingAssets(null)
      } else {
        debounce(
          () => {
            setMatchingAssets(searchAssets(inputValue, assets))
          },
          500,
          {
            leading: true,
          },
        )()
      }
    },
    [assets],
  )
  return {
    searchTerm,
    matchingAssets,
    handleInputChange,
  }
}
