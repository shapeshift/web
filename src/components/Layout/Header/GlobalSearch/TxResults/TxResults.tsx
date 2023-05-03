import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

import { ListItemSection } from '../ListItemSection'
import type { GlobalSearchResultsProps } from '../types'
import { TxResult } from './TxResult'

export const TxResults: React.FC<GlobalSearchResultsProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
  menuNodes,
}) => {
  const translate = useTranslate()
  const renderRows = useMemo(() => {
    return results.map((result, index) => {
      const { id } = result
      return (
        <TxResult
          key={`result-tx-${index}`}
          txId={id as TxId}
          activeIndex={activeIndex}
          index={index + startingIndex}
          onClick={onClick}
          ref={menuNodes.ref(index + startingIndex)}
        />
      )
    })
  }, [activeIndex, menuNodes, onClick, results, startingIndex])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('navBar.transactions')} />
      <List px={2}>{renderRows}</List>
    </>
  )
}
