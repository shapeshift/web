import debounce from 'lodash/debounce'
import { useCallback, useMemo, useState } from 'react'
import { filterAssetsBySearchTerm } from 'components/AssetSearch/helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import type { Asset } from 'lib/asset-service'
import { isSome } from 'lib/utils'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
            setMatchingAssets(filterAssetsBySearchTerm(inputValue, assets))
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
