import { Box, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useYieldOpportunities } from '../hooks/useYieldOpportunities'
import { YieldActivePositions } from './YieldActivePositions'
import { YieldAssetRow, YieldAssetRowSkeleton } from './YieldAssetRow'
import { YieldOpportunityCard } from './YieldOpportunityCard'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

type YieldAssetSectionProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const YieldAssetSection = memo(({ assetId, accountId }: YieldAssetSectionProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const isYieldXyzEnabled = useFeatureFlag('YieldXyz')

  const { yields, balances, isLoading } = useYieldOpportunities({ assetId, accountId })

  const sortedYields = useMemo(
    () => [...yields].sort((a, b) => b.rewardRate.total - a.rewardRate.total),
    [yields],
  )

  const bestYield = useMemo(() => sortedYields[0], [sortedYields])

  const hasActivePositions = useMemo(() => Object.keys(balances).length > 0, [balances])

  const yieldsWithoutPositions = useMemo(
    () => sortedYields.filter(y => !balances[y.id]),
    [sortedYields, balances],
  )

  const handleOpportunityClick = useCallback(
    (yieldItem: AugmentedYieldDto) => {
      navigate(`/yields/${yieldItem.id}`)
    },
    [navigate],
  )

  const yieldHeading = useMemo(() => translate('yieldXYZ.yield') ?? 'Yield', [translate])

  const opportunitiesHeading = useMemo(
    () => translate('yieldXYZ.opportunities') ?? 'Opportunities',
    [translate],
  )

  const loadingContent = useMemo(
    () => (
      <VStack spacing={4} align='stretch'>
        <YieldAssetRowSkeleton />
        <YieldAssetRowSkeleton />
      </VStack>
    ),
    [],
  )

  const activePositionsContent = useMemo(
    () => <YieldActivePositions balances={balances} yields={yields} assetId={assetId} />,
    [balances, yields, assetId],
  )

  const opportunityCardContent = useMemo(() => {
    if (!bestYield) return null
    return <YieldOpportunityCard maxApyYield={bestYield} onClick={handleOpportunityClick} />
  }, [bestYield, handleOpportunityClick])

  const opportunitiesListContent = useMemo(() => {
    if (yieldsWithoutPositions.length === 0) return null
    return (
      <VStack spacing={4} align='stretch'>
        <Text fontSize='sm' color='gray.500' fontWeight='medium' mt={2}>
          {opportunitiesHeading}
        </Text>
        {yieldsWithoutPositions.map(yieldItem => (
          <YieldAssetRow key={yieldItem.id} yieldItem={yieldItem} />
        ))}
      </VStack>
    )
  }, [yieldsWithoutPositions, opportunitiesHeading])

  if (!isYieldXyzEnabled) return null
  if (!isLoading && yields.length === 0) return null

  return (
    <Box mt={6}>
      <Heading as='h5' fontSize='md' mb={4}>
        {yieldHeading}
      </Heading>
      <Stack spacing={4}>
        {hasActivePositions && activePositionsContent}
        {isLoading && loadingContent}
        {!isLoading && !hasActivePositions && opportunityCardContent}
        {!isLoading && hasActivePositions && opportunitiesListContent}
      </Stack>
    </Box>
  )
})
