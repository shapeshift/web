import { Flex, forwardRef } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmptyByStakingId,
  selectAssetById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ResultButton } from '../ResultButton'

type StakingResultProps = {
  stakingId: OpportunityId
  index: number
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
}

export const StakingResult = forwardRef<StakingResultProps, 'div'>(
  ({ stakingId, onClick, index, activeIndex }, ref) => {
    const filter = useMemo(
      () => ({
        stakingId,
      }),
      [stakingId],
    )
    const opportunity = useAppSelector(state =>
      selectAggregatedEarnUserStakingOpportunitiesIncludeEmptyByStakingId(state, filter),
    )

    const handleClick = useCallback(() => {
      if (opportunity?.isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
        return
      }

      onClick({ type: GlobalSearchResultType.Asset, id: stakingId })
    }, [onClick, opportunity, stakingId])
    const asset = useAppSelector(state =>
      selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
    )
    const selected = activeIndex === index

    const subTextJoined = useMemo(() => {
      const aprElement = (
        <Amount.Percent value={bnOrZero(opportunity?.apy).toString()} suffix='APY' autoColor />
      )
      const hasBalanceElement = <RawText textTransform='capitalize'>{opportunity?.type}</RawText>
      const subText = [
        aprElement,
        ...(!bnOrZero(opportunity?.cryptoAmountBaseUnit).isZero() ? [hasBalanceElement] : []),
      ]

      return subText.map((element, index) => (
        <Flex gap={1} alignItems='center' key={`subtext-${index}`}>
          {index > 0 && <RawText>•</RawText>}
          {element}
        </Flex>
      ))
    }, [opportunity?.apy, opportunity?.cryptoAmountBaseUnit, opportunity?.type])

    if (!opportunity || !asset) return null
    return (
      <ResultButton ref={ref} aria-selected={selected ? true : undefined} onClick={handleClick}>
        <Flex gap={2} flex={1}>
          <AssetCell
            isExternal={opportunity.isReadOnly}
            assetId={opportunity.underlyingAssetId}
            icons={opportunity.icons}
            justifyContent='flex-start'
            subText={
              <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
                {subTextJoined}
              </Flex>
            }
          />
        </Flex>
        {!bnOrZero(opportunity.fiatAmount).isZero() && (
          <Flex flexDir='column' alignItems='flex-end'>
            <Amount.Fiat
              color='chakra-body-text'
              fontSize='sm'
              fontWeight='medium'
              value={opportunity.fiatAmount}
              height='20px'
              lineHeight='shorter'
            />
          </Flex>
        )}
      </ResultButton>
    )
  },
)
