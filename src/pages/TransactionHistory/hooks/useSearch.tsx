import { Asset } from '@shapeshiftoss/types'
import { useState } from 'react'
import { filterAssetsBySearchTerm } from 'components/AssetSearch/helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { selectAssetsByMarketCap } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSearch = () => {
  const assets = useAppSelector(selectAssetsByMarketCap)
  const [searchTerm, setSearchTerm] = useState('')
  const [matchingAssets, setMatchingAssets] = useState<Asset[]>([])
  const handleInputChange = (inputValue: string) => {
    setSearchTerm(inputValue)
    if (inputValue === '') {
      setMatchingAssets([])
    } else {
      setMatchingAssets(filterAssetsBySearchTerm(inputValue, assets))
    }
  }
  return {
    searchTerm,
    matchingAssets,
    handleInputChange
  }
}
