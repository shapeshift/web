import { Button, type GridProps, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Main } from 'components/Layout/Main'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'

import { LendingHeader } from './components/LendingHeader'
import { useAllLendingPositionsData } from './hooks/useAllLendingPositionsData'
import { useLendingPositionData } from './hooks/useLendingPositionData'
import { useLendingSupportedAssets } from './hooks/useLendingSupportedAssets'
import { useRepaymentLockData } from './hooks/useRepaymentLockData'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: 'repeat(4, 1fr)',
}

type LendingRowGridProps = {
  asset: Asset
  accountId: AccountId
  onPoolClick: (assetId: AssetId, accountId: AccountId) => void
}

const LendingRowGrid = ({ asset, accountId, onPoolClick }: LendingRowGridProps) => {
  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      assetId: asset.assetId,
      accountId,
    })

  const useRepaymentLockDataArgs = useMemo(
    () => ({ assetId: asset.assetId, accountId }),
    [asset.assetId, accountId],
  )
  const { data: repaymentLockData, isLoading: isRepaymentLockDataLoading } =
    useRepaymentLockData(useRepaymentLockDataArgs)

  const handlePoolClick = useCallback(() => {
    onPoolClick(asset.assetId, accountId)
  }, [accountId, asset.assetId, onPoolClick])

  if (
    lendingPositionData &&
    bnOrZero(lendingPositionData.collateralBalanceCryptoPrecision)
      .plus(lendingPositionData.debtBalanceFiatUSD)
      .isZero()
  )
    return null

  return (
    <Stack mx={-4}>
      <Button
        variant='ghost'
        display='grid'
        gridTemplateColumns={lendingRowGrid}
        columnGap={4}
        alignItems='center'
        textAlign='left'
        py={4}
        width='full'
        height='auto'
        color='text.base'
        onClick={handlePoolClick}
      >
        <AssetCell assetId={asset.assetId} />
        <Skeleton isLoaded={!isLendingPositionDataLoading}>
          <Stack spacing={0}>
            <Amount.Fiat value={lendingPositionData?.debtBalanceFiatUSD ?? '0'} />
          </Stack>
        </Skeleton>
        <Skeleton isLoaded={!isLendingPositionDataLoading}>
          <Stack spacing={0}>
            <Amount.Crypto
              value={lendingPositionData?.collateralBalanceCryptoPrecision ?? '0'}
              symbol={asset.symbol}
            />
            <Amount.Fiat
              value={lendingPositionData?.collateralBalanceFiatUserCurrency ?? '0'}
              fontSize='sm'
              color='text.subtle'
            />
          </Stack>
        </Skeleton>
        <Skeleton isLoaded={!isRepaymentLockDataLoading}>
          <RawText>{repaymentLockData} days</RawText>
        </Skeleton>
      </Button>
    </Stack>
  )
}

const LendingRowAssetAccountsGrids = ({
  asset,
  onPoolClick: handlePoolClick,
}: Omit<LendingRowGridProps, 'accountId'>) => {
  const {
    isLoading: isAllLendingPositionsDataLoading,
    positions,
    isActive,
  } = useAllLendingPositionsData({
    assetId: asset.assetId,
  })

  const grids = useMemo(() => {
    if (!isActive && !isAllLendingPositionsDataLoading) return null
    return positions
      .map(({ data }) => data)
      .filter(isSome)
      .map(position => (
        <LendingRowGrid
          asset={asset}
          accountId={position.accountId}
          onPoolClick={handlePoolClick}
        />
      ))
  }, [asset, handlePoolClick, isActive, isAllLendingPositionsDataLoading, positions])

  return <>{grids}</>
}

export const YourLoans = () => {
  const translate = useTranslate()
  const lendingHeader = useMemo(() => <LendingHeader />, [])

  const { data: lendingSupportedAssets } = useLendingSupportedAssets()

  const history = useHistory()

  const handlePoolClick = useCallback(
    (assetId: AssetId, accountId: AccountId) => {
      history.push(generatePath('/lending/poolAccount/:accountId/:assetId', { accountId, assetId }))
    },
    [history],
  )

  const lendingRowGrids = useMemo(() => {
    if (!lendingSupportedAssets) return new Array(2).fill(null).map(() => <Skeleton height={16} />)

    return lendingSupportedAssets.map(asset => (
      <LendingRowAssetAccountsGrids asset={asset} onPoolClick={handlePoolClick} />
    ))
  }, [handlePoolClick, lendingSupportedAssets])

  return (
    <Main headerComponent={lendingHeader}>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
        >
          <Text translation='lending.pool' />
          <HelperTooltip label={translate('lending.outstandingDebt')}>
            <Text translation='lending.outstandingDebt' textAlign='right' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.collateralValue')}>
            <Text translation='lending.collateralValue' textAlign='right' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.repaymentLock')}>
            <Text translation='lending.repaymentLock' textAlign='right' />
          </HelperTooltip>
        </SimpleGrid>
        {lendingRowGrids}
      </Stack>
    </Main>
  )
}
