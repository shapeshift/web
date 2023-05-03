import { List } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { ListItemSection } from '../ListItemSection'
import type { GlobalSearchResultsProps } from '../types'
import { AssetResult } from './AssetResult'

export const AssetResults: React.FC<GlobalSearchResultsProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
  menuNodes,
}) => {
  const renderItems = useMemo(() => {
    return results.map((item, index) => (
      <AssetResult
        key={`result-assets-${index}`}
        index={index + startingIndex}
        activeIndex={activeIndex}
        assetId={item.id as AssetId}
        onClick={onClick}
        ref={menuNodes.ref(index)}
      />
    ))
  }, [activeIndex, menuNodes, onClick, results, startingIndex])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title='Assets' />
      <List px={2}>{renderItems}</List>
    </>
  )
}
