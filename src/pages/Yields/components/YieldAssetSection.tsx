import { Card, CardBody, CardHeader, Heading, Stack, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { YieldActivePositions } from './YieldActivePositions'
import { YieldEnterModal } from './YieldEnterModal'
import { YieldItemSkeleton } from './YieldItem'
import { YieldOpportunityCard } from './YieldOpportunityCard'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { getBestActionableYield } from '@/lib/yieldxyz/utils'
import type { AugmentedYieldBalanceWithAccountId } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const {
    state: { isConnected },
  } = useWallet()
  const { data: yieldsData, isLoading: isYieldsLoading } = useYields()
  const balanceOptions = useMemo(
    () => (accountId ? { accountIds: [accountId] } : { accountIds: enabledWalletAccountIds }),
    [accountId, enabledWalletAccountIds],
  )
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

  const filteredBalancesByYieldId = useMemo(() => {
    if (!allBalancesData?.byYieldId || !yields.length) return undefined

    const accountFilter = accountId ? fromAccountId(accountId).account.toLowerCase() : null
    const relevantYieldIds = new Set(yields.map(y => y.id))

    const result: Record<string, AugmentedYieldBalanceWithAccountId[]> = {}

    for (const [yieldId, balances] of Object.entries(allBalancesData.byYieldId)) {
      if (!relevantYieldIds.has(yieldId)) continue

      const filteredBalances = accountFilter
        ? balances.filter(b => b.address.toLowerCase() === accountFilter)
        : balances

      if (filteredBalances.length > 0) {
        result[yieldId] = filteredBalances
      }
    }

    return Object.keys(result).length > 0 ? result : undefined
  }, [allBalancesData, yields, accountId])

  const bestYield = useMemo(() => getBestActionableYield(yields), [yields])

  const hasActivePositions = Boolean(filteredBalancesByYieldId)

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
              <YieldActivePositions
                balancesByYieldId={filteredBalancesByYieldId}
                yields={yields}
                assetId={assetId}
              />
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
          accountId={accountId}
        />
      )}
    </>
  )
})
