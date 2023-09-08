import {
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Skeleton,
  Stack,
  StackDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import type { LpId, OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { AssetEquityType } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssetEquityItemsByFilter,
  selectAssets,
  selectEquityTotalBalance,
  selectOpportunityApiPending,
  selectPortfolioLoading,
  selectUnderlyingLpAssetsWithBalancesAndIcons,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityAccountRow } from './EquityAccountRow'
import { EquityLpRow } from './EquityLpRow'
import { EquityRowLoading } from './EquityRow'
import { EquityStakingRow } from './EquityStakingRow'
import { UnderlyingAsset } from './UnderlyingAsset'

type EquityProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const Equity = ({ assetId, accountId }: EquityProps) => {
  const translate = useTranslate()
  const portfolioLoading = useSelector(selectPortfolioLoading)
  const opportunitiesLoading = useAppSelector(selectOpportunityApiPending)
  const isLoading = portfolioLoading || opportunitiesLoading
  const assets = useAppSelector(selectAssets)
  const asset = assets[assetId]
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])

  const totalEquityBalance = useAppSelector(state => selectEquityTotalBalance(state, filter))
  const equityRows = useAppSelector(state => selectAssetEquityItemsByFilter(state, filter))

  const { amountCryptoPrecision: totalCryptoHumanBalance, fiatAmount: totalFiatBalance } =
    totalEquityBalance

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId,
      accountId,
      lpId: assetId as LpId,
    }),
    [accountId, assetId],
  )

  const underlyingAssetsWithBalancesAndIcons = useAppSelector(state =>
    selectUnderlyingLpAssetsWithBalancesAndIcons(state, lpAssetBalanceFilter),
  )

  const renderEquityRows = useMemo(() => {
    if (portfolioLoading)
      return Array.from({ length: 4 }).map((_, index) => (
        <EquityRowLoading key={`eq-row-loading-${index}`} />
      ))
    return equityRows.map(item => {
      switch (item.type) {
        case AssetEquityType.Staking:
          return (
            <EquityStakingRow
              key={item.id}
              assetId={assetId}
              opportunityId={item.id as OpportunityId}
              totalFiatBalance={totalFiatBalance}
              color={item.color}
              accountId={accountId}
            />
          )
        case AssetEquityType.LP:
          return (
            <EquityLpRow
              key={item.id}
              assetId={assetId}
              opportunityId={item.id as OpportunityId}
              totalFiatBalance={totalFiatBalance}
              color={item.color}
              accountId={accountId}
            />
          )
        case AssetEquityType.Account:
          return (
            <EquityAccountRow
              key={item.id}
              assetId={assetId}
              accountId={item.id as AccountId}
              totalFiatBalance={totalFiatBalance}
              color={item.color}
            />
          )
        default:
          return null
      }
    })
  }, [accountId, assetId, equityRows, portfolioLoading, totalFiatBalance])

  const renderUnderlyingAssets = useMemo(() => {
    if (!underlyingAssetsWithBalancesAndIcons?.length) return
    return (
      <Flex flexDir='column' mt={2}>
        {underlyingAssetsWithBalancesAndIcons.map(underlyingAsset => (
          <UnderlyingAsset
            key={`equity-underlying-${underlyingAsset.assetId}`}
            {...underlyingAsset}
          />
        ))}
      </Flex>
    )
  }, [underlyingAssetsWithBalancesAndIcons])

  if (!asset) return null

  return (
    <Card variant='outline'>
      <CardHeader display='flex' gap={4} alignItems='center'>
        <Flex flexDir='column' flex={1}>
          <Heading as='h5'>{translate('common.allocation')}</Heading>
          <Flex flexDir='column' gap={1}>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Fiat fontSize='xl' value={totalFiatBalance} lineHeight={1} />
            </Skeleton>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Crypto
                variant='sub-text'
                value={totalCryptoHumanBalance}
                symbol={asset.symbol}
                lineHeight={1}
              />
            </Skeleton>
          </Flex>
          {renderUnderlyingAssets}
        </Flex>
      </CardHeader>
      <CardBody pt={0} pb={2}>
        <Stack
          spacing={0}
          mt={2}
          mx={-4}
          divider={<StackDivider borderColor={borderColor} style={{ marginLeft: 14 }} />}
        >
          {renderEquityRows}
        </Stack>
      </CardBody>
    </Card>
  )
}
