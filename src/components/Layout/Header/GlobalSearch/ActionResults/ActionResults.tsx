import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { SendResult } from 'state/slices/search-selectors'

import { ListItemSection } from '../ListItemSection'
import type { GlobalSearchResultsProps } from '../types'
import { ActionResult } from './ActionResult'

export const ActionResults: React.FC<GlobalSearchResultsProps<SendResult>> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
  menuNodes,
}) => {
  const translate = useTranslate()
  const renderItems = useMemo(() => {
    if (!searchQuery?.length) return null
    return results.map((item, index) => (
      <ActionResult
        key={`result-action-${index}`}
        index={index + startingIndex}
        activeIndex={activeIndex}
        searchQuery={searchQuery}
        assetId={item.id}
        onClick={onClick}
        ref={menuNodes.ref(index)}
      />
    ))
  }, [activeIndex, menuNodes, onClick, results, searchQuery, startingIndex])

  if (!renderItems?.length) return null

  return (
    <>
      <ListItemSection title={translate('common.action')} />
      <List px={2}>{renderItems}</List>
    </>
  )
}
