import { Box, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useYieldOpportunities } from '../hooks/useYieldOpportunities'
import { YieldActivePositions } from './YieldActivePositions'
import { YieldAssetRow, YieldAssetRowSkeleton } from './YieldAssetRow'
import { YieldOpportunityCard } from './YieldOpportunityCard'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

type YieldAssetSectionProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const YieldAssetSection = ({ assetId, accountId }: YieldAssetSectionProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const isYieldXyzEnabled = useFeatureFlag('YieldXyz')

  const { yields, balances, isLoading } = useYieldOpportunities({ assetId, accountId })

  if (!isYieldXyzEnabled) return null
  if (!isLoading && yields.length === 0) return null

  // Sort yields by APY descending
  const sortedYields = [...yields].sort((a, b) => {
    return b.rewardRate.total - a.rewardRate.total
  })

  const bestYield = sortedYields[0]

  const hasActivePositions = Object.keys(balances).length > 0

  const handleOpportunityClick = (yieldItem: any) => {
    navigate(`/yields/${yieldItem.id}`)
  }

  return (
    <Box mt={6}>
      <Heading as='h5' fontSize='md' mb={4}>
        {translate('yieldXYZ.yield') ?? 'Yield'}
      </Heading>

      <Stack spacing={4}>
        {/* Active Positions Table */}
        {hasActivePositions && (
          <YieldActivePositions balances={balances} yields={yields} assetId={assetId} />
        )}

        {/* Loading State */}
        {isLoading && (
          <VStack spacing={4} align='stretch'>
            <YieldAssetRowSkeleton />
            <YieldAssetRowSkeleton />
          </VStack>
        )}

        {/* Upsell State: No active positions, show best opportunity card */}
        {!isLoading && !hasActivePositions && bestYield && (
          <YieldOpportunityCard maxApyYield={bestYield} onClick={handleOpportunityClick} />
        )}

        {/* Opportunities list: only show when user has active positions (to show additional opportunities) */}
        {!isLoading &&
          hasActivePositions &&
          (() => {
            const yieldsWithoutPositions = sortedYields.filter(y => !balances[y.id])
            if (yieldsWithoutPositions.length === 0) return null
            return (
              <VStack spacing={4} align='stretch'>
                <Text fontSize='sm' color='gray.500' fontWeight='medium' mt={2}>
                  {translate('yieldXYZ.opportunities') ?? 'Opportunities'}
                </Text>
                {yieldsWithoutPositions.map(yieldItem => (
                  <YieldAssetRow key={yieldItem.id} yieldItem={yieldItem} />
                ))}
              </VStack>
            )
          })()}
      </Stack>
    </Box>
  )
}
