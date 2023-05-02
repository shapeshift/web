import { Button, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'
import { selectAggregatedEarnUserStakingOpportunityByStakingId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingResultProps = {
  stakingId: OpportunityId
  index: number
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
}

export const StakingResult: React.FC<StakingResultProps> = ({
  stakingId,
  onClick,
  index,
  activeIndex,
}) => {
  const oppportunity = useAppSelector(state =>
    selectAggregatedEarnUserStakingOpportunityByStakingId(state, { stakingId }),
  )
  const selected = activeIndex === index

  const subTextJoined = useMemo(() => {
    const aprElement = (
      <Amount.Percent value={bnOrZero(oppportunity?.apy).toString()} suffix='APY' autoColor />
    )
    const hasBalanceElement = <RawText textTransform='capitalize'>{oppportunity?.type}</RawText>
    const subText = [
      aprElement,
      ...(bnOrZero(oppportunity?.cryptoAmountBaseUnit).gt(0) ? [hasBalanceElement] : []),
    ]

    return subText.map((element, index) => (
      <Flex gap={1} alignItems='center' key={`subtext-${index}`}>
        {index > 0 && <RawText>•</RawText>}
        {element}
      </Flex>
    ))
  }, [oppportunity?.apy, oppportunity?.cryptoAmountBaseUnit, oppportunity?.type])

  if (!oppportunity) return null
  return (
    <Button
      display='grid'
      gridTemplateColumns='50% 1fr'
      alignItems='center'
      variant='ghost'
      py={2}
      height='auto'
      width='full'
      aria-selected={selected ? true : undefined}
      _selected={{ bg: 'whiteAlpha.100' }}
      onClick={() => onClick({ type: GlobalSearchResultType.Asset, id: stakingId })}
    >
      <Flex gap={2} flex={1}>
        <AssetCell
          assetId={oppportunity.underlyingAssetId}
          icons={oppportunity.icons}
          justifyContent='flex-start'
          subText={
            <Flex gap={1} fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
              {subTextJoined}
            </Flex>
          }
        />
      </Flex>
    </Button>
  )
}
