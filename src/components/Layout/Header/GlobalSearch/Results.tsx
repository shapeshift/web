import React, { useMemo } from 'react'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'

import { AssetResult } from './AssetResultRow'
import { StakingResult } from './StakingResults/StakingResult'

type GlobalSearchResultsProps = {
  results: GlobalSearchResult[]
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
}

export const GlobalSearchList: React.FC<GlobalSearchResultsProps> = ({
  results,
  activeIndex,
  onClick,
}) => {
  const renderRows = useMemo(() => {
    return results.map((result, index) => {
      switch (result.type) {
        case GlobalSearchResultType.Asset:
          return (
            <AssetResult
              key={`asset-result-${index}`}
              index={index}
              activeIndex={activeIndex}
              assetId={result.id}
              onClick={() => onClick(result)}
            />
          )
        case GlobalSearchResultType.StakingOpportunity:
          return (
            <StakingResult
              key={`staking-result-${index}`}
              index={index}
              activeIndex={activeIndex}
              stakingId={result.id}
              onClick={() => onClick(result)}
            />
          )
        default:
          return null
      }
    })
  }, [activeIndex, onClick, results])
  return <>{renderRows}</>
}
