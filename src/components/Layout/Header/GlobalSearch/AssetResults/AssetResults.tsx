import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AssetSearchResult } from 'state/slices/search-selectors'

import { ListItemSection } from '../ListItemSection'
import type { GlobalSearchResultsProps } from '../types'
import { AssetResult } from './AssetResult'

export const AssetResults: React.FC<GlobalSearchResultsProps<AssetSearchResult>> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
  menuNodes,
}) => {
  const translate = useTranslate()
  const renderItems = useMemo(() => {
    return results.map((item, index) => (
      <AssetResult
        key={`result-assets-${index}`}
        index={index + startingIndex}
        activeIndex={activeIndex}
        assetId={item.id}
        onClick={onClick}
        ref={menuNodes.ref(index)}
      />
    ))
  }, [activeIndex, menuNodes, onClick, results, startingIndex])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('navBar.assets')} />
      <List px={2}>{renderItems}</List>
    </>
  )
}
