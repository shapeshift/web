import { Card, CardBody, CardHeader, Grid, Heading, Stack, useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useIsFetching } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetAccountRow } from './AssetAccountRow'

import { PullToRefreshList } from '@/components/PullToRefresh/PullToRefreshList'
import { Text } from '@/components/Text'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectIsAnyPortfolioGetAccountLoading } from '@/state/slices/portfolioSlice/selectors'
import { selectAccountIdsByAssetIdAboveBalanceThreshold } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type AssetAccountsProps = {
  assetId: AssetId
  accountId?: AccountId
}

const gridTemplateColumns = {
  base: '1fr 1fr',
  md: '1fr 1fr 1fr',
  lg: '2fr 150px repeat(2, 1fr)',
}

const allocationTextDisplay = { base: 'none', lg: 'block' }
const amountTextDisplay = { base: 'none', md: 'block', lg: 'block' }

export const AssetAccounts = ({ assetId, accountId }: AssetAccountsProps) => {
  const translate = useTranslate()
  const [isMobile] = useMediaQuery(`(max-width: ${breakpoints['md']})`, { ssr: false })
  const dispatch = useAppDispatch()
  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')

  const getAccountFetching = useIsFetching({ queryKey: ['getAccount'] })
  const portalsAccountFetching = useIsFetching({ queryKey: ['portalsAccount'] })
  const portalsPlatformsFetching = useIsFetching({ queryKey: ['portalsPlatforms'] })
  const isPortfolioLoading = useAppSelector(selectIsAnyPortfolioGetAccountLoading)

  const isRefreshing =
    getAccountFetching > 0 ||
    portalsAccountFetching > 0 ||
    portalsPlatformsFetching > 0 ||
    isPortfolioLoading

  const accountIds = useAppSelector(state =>
    selectAccountIdsByAssetIdAboveBalanceThreshold(state, { assetId }),
  )

  const handleRefresh = useCallback(async () => {
    dispatch(portfolioApi.util.resetApiState())
    dispatch(txHistoryApi.util.resetApiState())

    const { getAllTxHistory } = txHistoryApi.endpoints

    accountIds.forEach(accountId => {
      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })

    if (isLazyTxHistoryEnabled) return

    accountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [dispatch, accountIds, isLazyTxHistoryEnabled])

  if ((accountIds && accountIds.length === 0) || accountId) return null

  const content = (
    <Card>
      <CardHeader>
        <Heading as='h5'>{translate('assets.assetDetails.assetAccounts.assetAllocation')}</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Grid
            templateColumns={gridTemplateColumns}
            gap='1rem'
            pl={4}
            pr={4}
            fontSize='sm'
            lineHeight='shorter'
          >
            <Text translation='assets.assetDetails.assetAccounts.account' color='text.subtle' />
            <Text
              translation='assets.assetDetails.assetAccounts.allocation'
              color='text.subtle'
              textAlign='right'
              display={allocationTextDisplay}
            />
            <Text
              translation='assets.assetDetails.assetAccounts.amount'
              display={amountTextDisplay}
              color='text.subtle'
              textAlign='right'
            />
            <Text
              translation='assets.assetDetails.assetAccounts.value'
              textAlign='right'
              color='text.subtle'
            />
          </Grid>
          {accountIds.map(accountId => (
            <AssetAccountRow
              accountId={accountId}
              assetId={assetId}
              key={accountId}
              showAllocation
            />
          ))}
        </Stack>
      </CardBody>
    </Card>
  )

  if (!isMobile) {
    return content
  }

  return (
    <PullToRefreshList onRefresh={handleRefresh} isRefreshing={isRefreshing}>
      {content}
    </PullToRefreshList>
  )
}
