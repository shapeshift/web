import { useMemo } from 'react'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { selectAggregatedEarnUserLpOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LpCard } from './LpCard'

type LpCardsProps = {
  ids: OpportunityId[]
}

export const LpCards: React.FC<LpCardsProps> = ({ ids }) => {
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const filtered = lpOpportunities.filter(e => ids.includes(e.assetId as OpportunityId))
  const renderCards = useMemo(() => {
    return filtered.map(e => <LpCard key={e.assetId} {...e} />)
  }, [filtered])
  return <>{renderCards}</>
}
