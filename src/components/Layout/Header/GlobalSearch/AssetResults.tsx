import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { GlobalSearchResult } from 'state/slices/search-selectors'

import { AssetResult } from './AssetResultRow'
import { ListItemSection } from './ListItemSection'

type AssetResultsProps = {
  results: GlobalSearchResult[]
  activeIndex?: number
  startingIndex: number
  onClick: (arg: GlobalSearchResult) => void
  searchQuery?: string
}

export const AssetResults: React.FC<AssetResultsProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
}) => {
  const renderItems = useMemo(() => {
    return results.map((item, index) => (
      <AssetResult
        key={`result-assets-${index}`}
        index={index + startingIndex}
        activeIndex={activeIndex}
        assetId={item.id}
        onClick={onClick}
      />
    ))
  }, [activeIndex, onClick, results, startingIndex])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title='Assets' />
      <List px={2}>{renderItems}</List>
    </>
  )
}
