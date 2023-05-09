import { List } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ListItemSection } from '../ListItemSection'
import type { GlobalSearchResultsProps } from '../types'
import { SendResult } from './SendResult'

export const SendResults: React.FC<GlobalSearchResultsProps> = ({
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
      <SendResult
        key={`result-send-${index}`}
        index={index + startingIndex}
        activeIndex={activeIndex}
        searchQuery={searchQuery}
        assetId={item.id as AssetId}
        onClick={onClick}
        ref={menuNodes.ref(index)}
      />
    ))
  }, [activeIndex, menuNodes, onClick, results, searchQuery, startingIndex])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('modals.send.confirm.send')} />
      <List px={2}>{renderItems}</List>
    </>
  )
}
