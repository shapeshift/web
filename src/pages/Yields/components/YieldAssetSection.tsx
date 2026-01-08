import { Box, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { YieldActivePositions } from './YieldActivePositions'
import { YieldItem, YieldItemSkeleton } from './YieldItem'
import { YieldOpportunityCard } from './YieldOpportunityCard'

import { getConfig } from '@/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import type { YieldBalanceAggregate } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldAssetSectionProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const YieldAssetSection = memo(({ assetId, accountId }: YieldAssetSectionProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const isYieldXyzEnabled = useFeatureFlag('YieldXyz')
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { data: yieldsData, isLoading: isYieldsLoading } = useYields()
  const balanceOptions = useMemo(() => (accountId ? { accountIds: [accountId] } : {}), [accountId])
  const { data: allBalancesData, isLoading: isBalancesLoading } =
    useAllYieldBalances(balanceOptions)
  const isLoading = isYieldsLoading || isBalancesLoading

  const yields = useMemo(() => {
    if (!yieldsData?.all || !asset) return []
    return yieldsData.all.filter(yieldItem => {
      const matchesToken = yieldItem.token.assetId === assetId
      const matchesInput = yieldItem.inputTokens.some(t => t.assetId === assetId)
      return matchesToken || matchesInput
    })
  }, [yieldsData, asset, assetId])

  const aggregated = useMemo(() => {
    const multiAccountEnabled = getConfig().VITE_FEATURE_YIELD_MULTI_ACCOUNT
    if (multiAccountEnabled && !accountId)
      throw new Error('Multi-account yield not yet implemented')
    if (!allBalancesData?.aggregated || !yields.length) return {}

    const accountFilter = accountId ? fromAccountId(accountId).account.toLowerCase() : null
    const allBalances = allBalancesData.byYieldId

    return yields.reduce(
      (acc, yieldItem) => {
        const aggregate = allBalancesData.aggregated[yieldItem.id]
        if (!aggregate) return acc
        if (accountFilter) {
          const itemBalances = allBalances?.[yieldItem.id] || []
          if (!itemBalances.some(b => b.address.toLowerCase() === accountFilter)) return acc
        }
        acc[yieldItem.id] = aggregate
        return acc
      },
      {} as Record<string, YieldBalanceAggregate>,
    )
  }, [allBalancesData, yields, accountId])

  const sortedYields = useMemo(
    () => [...yields].sort((a, b) => b.rewardRate.total - a.rewardRate.total),
    [yields],
  )

  const bestYield = sortedYields[0]

  const hasActivePositions = Object.keys(aggregated).length > 0

  const yieldsWithoutPositions = useMemo(
    () => sortedYields.filter(y => !aggregated[y.id]),
    [sortedYields, aggregated],
  )

  const handleOpportunityClick = useCallback(
    (yieldItem: AugmentedYieldDto) => {
      navigate(`/yields/${yieldItem.id}`)
    },
    [navigate],
  )

  const yieldHeading = translate('yieldXYZ.yield') ?? 'Yield'

  const opportunitiesHeading = translate('yieldXYZ.opportunities') ?? 'Opportunities'

  const loadingContent = useMemo(
    () => (
      <VStack spacing={4} align='stretch'>
        <YieldItemSkeleton variant='row' />
        <YieldItemSkeleton variant='row' />
      </VStack>
    ),
    [],
  )

  const activePositionsContent = useMemo(
    () => <YieldActivePositions aggregated={aggregated} yields={yields} assetId={assetId} />,
    [aggregated, yields, assetId],
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
          <YieldItem
            key={yieldItem.id}
            data={{ type: 'single', yieldItem }}
            variant='row'
            onEnter={handleOpportunityClick}
          />
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
