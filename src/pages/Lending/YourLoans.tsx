import { Button, type GridProps, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Main } from 'components/Layout/Main'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LendingHeader } from './components/LendingHeader'
import { useLendingPositionData } from './hooks/useLendingPositionData'
import { useLendingSupportedAssets } from './hooks/useLendingSupportedAssets'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: 'repeat(4, 1fr)',
}

type LendingRowGridProps = {
  asset: Asset
  onPoolClick: (assetId: AssetId) => void
}

const LendingRowGrid = ({ asset, onPoolClick }: LendingRowGridProps) => {
  // TODO(gomes): this only handles displaying positions of account 0 for now - we may want to make this component accomodate positions over all accounts
  // however, this would rug the "Repayment Lock" data, so we need to figure out a UX way around this

  const accountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(asset.assetId).chainId),
    ) ?? ''

  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      assetId: asset.assetId,
      accountId,
    })

  const handlePoolClick = useCallback(() => {
    onPoolClick(asset.assetId)
  }, [asset.assetId, onPoolClick])

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
        <Skeleton isLoaded={!isLendingPositionDataLoading}>
          {/* TODO(gomes): programmatic */}
          <RawText>30 days</RawText>
        </Skeleton>
      </Button>
    </Stack>
  )
}

export const YourLoans = () => {
  const translate = useTranslate()
  const lendingHeader = useMemo(() => <LendingHeader />, [])

  const { data: lendingSupportedAssets } = useLendingSupportedAssets()

  const history = useHistory()

  const handlePoolClick = useCallback(
    (assetId: AssetId) => {
      history.push(`/lending/pool/${assetId}`)
    },
    [history],
  )

  const lendingRowGrids = useMemo(() => {
    if (!lendingSupportedAssets) return new Array(2).fill(null).map(() => <Skeleton height={16} />)
    return lendingSupportedAssets.map(asset => (
      <LendingRowGrid asset={asset} onPoolClick={handlePoolClick} />
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
