import { Card, CardBody, CardHeader, Heading, Stack, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { YieldActivePositions } from './YieldActivePositions'
import { YieldEnterModal } from './YieldEnterModal'
import { YieldItemSkeleton } from './YieldItem'
import { YieldOpportunityCard } from './YieldOpportunityCard'

import { getConfig } from '@/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import type { YieldBalanceAggregate } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'

const LoadingContent = (
  <VStack spacing={4} align='stretch'>
    <YieldItemSkeleton variant='row' />
    <YieldItemSkeleton variant='row' />
  </VStack>
)

type YieldAssetSectionProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const YieldAssetSection = memo(({ assetId, accountId }: YieldAssetSectionProps) => {
  const translate = useTranslate()
  const isYieldXyzEnabled = useFeatureFlag('YieldXyz')
  const {
    state: { isConnected },
  } = useWallet()
  const { data: yieldsData, isLoading: isYieldsLoading } = useYields()
  const balanceOptions = useMemo(() => (accountId ? { accountIds: [accountId] } : {}), [accountId])
  const { data: allBalancesData, isLoading: isBalancesLoading } =
    useAllYieldBalances(balanceOptions)
  const isLoading = isYieldsLoading || isBalancesLoading

  const [isEnterModalOpen, setIsEnterModalOpen] = useState(false)
  const [selectedYield, setSelectedYield] = useState<AugmentedYieldDto | null>(null)

  const yields = useMemo(() => {
    if (!yieldsData?.all) return []
    return yieldsData.all.filter(yieldItem => {
      const matchesToken = yieldItem.token.assetId === assetId
      const matchesInput = yieldItem.inputTokens.some(t => t.assetId === assetId)
      return matchesToken || matchesInput
    })
  }, [yieldsData, assetId])

  const aggregated = useMemo(() => {
    const multiAccountEnabled = getConfig().VITE_FEATURE_YIELD_MULTI_ACCOUNT
    if (multiAccountEnabled && !accountId) {
      console.warn('[YieldAssetSection] Multi-account yield enabled but no accountId provided')
      return {}
    }
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

  const handleOpportunityClick = useCallback((yieldItem: AugmentedYieldDto) => {
    setSelectedYield(yieldItem)
    setIsEnterModalOpen(true)
  }, [])

  const handleEnterModalClose = useCallback(() => {
    setIsEnterModalOpen(false)
    setSelectedYield(null)
  }, [])

  if (!isYieldXyzEnabled) return null
  if (!isConnected) return null
  if (!isLoading && yields.length === 0) return null

  return (
    <>
      <Card variant='dashboard'>
        <CardHeader borderBottomWidth={{ md: 0 }}>
          <Heading as='h5'>{translate('yieldXYZ.yield')}</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Stack spacing={4}>
            {hasActivePositions && (
              <YieldActivePositions aggregated={aggregated} yields={yields} assetId={assetId} />
            )}
            {isLoading && LoadingContent}
            {!isLoading && !hasActivePositions && bestYield && (
              <YieldOpportunityCard maxApyYield={bestYield} onClick={handleOpportunityClick} />
            )}
          </Stack>
        </CardBody>
      </Card>
      {selectedYield && (
        <YieldEnterModal
          isOpen={isEnterModalOpen}
          onClose={handleEnterModalClose}
          yieldItem={selectedYield}
        />
      )}
    </>
  )
})
