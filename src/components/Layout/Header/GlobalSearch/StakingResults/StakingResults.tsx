import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult } from 'state/slices/search-selectors'

import { ListItemSection } from '../ListItemSection'
import { StakingResult } from './StakingResult'

type StakingResultProps = {
  results: GlobalSearchResult[]
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
  startingIndex: number
}
export const StakingResults: React.FC<StakingResultProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
}) => {
  const renderRows = useMemo(() => {
    return results.map((result, index) => {
      const { id } = result
      return (
        <StakingResult
          stakingId={id as StakingId}
          index={index + startingIndex}
          key={`staking-${index}`}
          activeIndex={activeIndex}
          onClick={() => onClick(result)}
        />
      )
    })
  }, [activeIndex, onClick, results, startingIndex])
  return (
    <>
      <ListItemSection title='Staking' />
      <List px={2}>{renderRows}</List>
    </>
  )
}
