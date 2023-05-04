import type { Asset } from '@shapeshiftoss/asset-service'
import debounce from 'lodash/debounce'
import { useCallback, useMemo, useState } from 'react'
import { filterAssetsBySearchTerm } from 'components/AssetSearch/helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { isSome } from 'lib/utils'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useSearch = () => {
  const assetsById = useAppSelector(selectAssets)
  // TODO(gomes): This shouldn't be a view-layer concern. To be tackled in a follow-up PR not to tackle the diff of https://github.com/shapeshift/web/pull/4429
  // - selectAssets will be LSP renamed to selectAssetsById
  // - selectAssets will now be a selector that returns Asset[]
  // We could use selectAssetsByMarketCap but this is wrong. We don't care about the market cap here.
  // While at it, this shouldn't be selecting assets altogether, but AssetIds, see consumption in <TransactionHistory />
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
