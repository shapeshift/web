import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'
import { selectAggregatedEarnUserLpOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ListItemSection } from '../ListItemSection'
import { LpResult } from './LpResult'

type LpResultProps = {
  results: GlobalSearchResult[]
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
  startingIndex: number
}
export const LpResults: React.FC<LpResultProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
}) => {
  const ids = results.map(result => result.id)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const filteredDown = lpOpportunities.filter(e => ids.includes(e.id as OpportunityId))

  const renderRows = useMemo(() => {
    return filteredDown.map((result, index) => {
      return (
        <LpResult
          opportunity={result}
          index={index + startingIndex}
          key={`lp-${index}`}
          activeIndex={activeIndex}
          onClick={() => onClick({ type: GlobalSearchResultType.LpOpportunity, id: result.id })}
        />
      )
    })
  }, [activeIndex, filteredDown, onClick, startingIndex])
  return (
    <>
      <ListItemSection title='Liquidity Pools' />
      <List px={2}>{renderRows}</List>
    </>
  )
}
