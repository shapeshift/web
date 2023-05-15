import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { OpportunitySearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'
import { selectAggregatedEarnUserLpOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ListItemSection } from '../ListItemSection'
import type { GlobalSearchResultsProps } from '../types'
import { LpResult } from './LpResult'

export const LpResults: React.FC<GlobalSearchResultsProps<OpportunitySearchResult>> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
  menuNodes,
}) => {
  const translate = useTranslate()
  const ids = results.map(result => result.id)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const filteredDown = lpOpportunities.filter(e => ids.includes(e.id))

  const renderRows = useMemo(() => {
    return filteredDown.map((result, index) => {
      return (
        <LpResult
          opportunity={result}
          index={index + startingIndex}
          key={`lp-${index}`}
          activeIndex={activeIndex}
          onClick={() => onClick({ type: GlobalSearchResultType.LpOpportunity, id: result.id })}
          ref={menuNodes.ref(index + startingIndex)}
        />
      )
    })
  }, [activeIndex, filteredDown, menuNodes, onClick, startingIndex])
  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('defi.liquidityPools')} />
      <List px={2}>{renderRows}</List>
    </>
  )
}
