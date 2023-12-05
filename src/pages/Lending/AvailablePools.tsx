import { CheckCircleIcon } from '@chakra-ui/icons'
import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack, Tag, TagLeftIcon } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useRouteMatch } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Main } from 'components/Layout/Main'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'

import { LendingHeader } from './components/LendingHeader'
import { useAllLendingPositionsData } from './hooks/useAllLendingPositionsData'
import { useLendingSupportedAssets } from './hooks/useLendingSupportedAssets'
import { usePoolDataQuery } from './hooks/usePoolDataQuery'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '200px repeat(3, 1fr)',
  xl: '200px repeat(5, 1fr)',
}
const mobileDisplay = {
  base: 'none',
  lg: 'flex',
}

const largeDisplay = {
  base: 'none',
  xl: 'flex',
}

const mobilePadding = {
  base: 4,
  lg: 4,
  xl: 0,
}
const listMargin = {
  base: 0,
  lg: 0,
  xl: -4,
}

type LendingPoolButtonProps = {
  asset: Asset
  onPoolClick: (assetId: AssetId) => void
}

const LendingPoolButton = ({ asset, onPoolClick }: LendingPoolButtonProps) => {
  const usePoolDataArgs = useMemo(() => ({ poolAssetId: asset.assetId }), [asset.assetId])
  const { data: poolData, isLoading: isPoolDataLoading } = usePoolDataQuery(usePoolDataArgs)

  const { isLoading: isLendingPositionDataLoading } = useAllLendingPositionsData({
    assetId: asset.assetId,
  })

  const isLoaded = useMemo(
    () => !isPoolDataLoading && !isLendingPositionDataLoading,
    [isLendingPositionDataLoading, isPoolDataLoading],
  )

  const handlePoolClick = useCallback(() => {
    onPoolClick(asset.assetId)
  }, [asset.assetId, onPoolClick])
  return (
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
      <Skeleton isLoaded={isLoaded} display={mobileDisplay}>
        <Flex>
          <Tag colorScheme='green'>
            <TagLeftIcon as={CheckCircleIcon} />
            Healthy
          </Tag>
        </Flex>
      </Skeleton>
      <Skeleton isLoaded={isLoaded}>
        <Amount.Fiat value={poolData?.totalDebtUserCurrency ?? '0'} />
      </Skeleton>
      <Skeleton isLoaded={isLoaded} display={largeDisplay}>
        <Amount.Crypto
          value={poolData?.totalCollateralCryptoPrecision ?? '0'}
          symbol={asset.symbol}
        />
      </Skeleton>
      <Skeleton isLoaded={isLoaded} display={mobileDisplay}>
        <Amount.Percent value={poolData?.collateralizationRatioPercentDecimal ?? '0'} />
      </Skeleton>
      <Skeleton isLoaded={isLoaded} display={largeDisplay}>
        <RawText>{poolData?.totalBorrowers ?? '0'}</RawText>
      </Skeleton>
    </Button>
  )
}

export const AvailablePools = () => {
  const translate = useTranslate()
  const history = useHistory()
  const { path } = useRouteMatch()
  const handlePoolClick = useCallback(
    (assetId: AssetId) => {
      history.push(`${path}/pool/${assetId}`)
    },
    [history, path],
  )
  const headerComponent = useMemo(() => <LendingHeader />, [])
  const { data: lendingSupportedAssets } = useLendingSupportedAssets({ type: 'collateral' })

  const lendingRows = useMemo(() => {
    if (!lendingSupportedAssets) return new Array(2).fill(null).map(() => <Skeleton height={16} />)

    return lendingSupportedAssets.map(asset => (
      <LendingPoolButton asset={asset} onPoolClick={handlePoolClick} />
    ))
  }, [handlePoolClick, lendingSupportedAssets])

  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='lending.pool' />
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('lending.poolDepth')}>
              <Text translation='lending.poolDepth' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('lending.totalDebtBalance')}>
              <Text translation='lending.totalDebtBalance' />
            </HelperTooltip>
          </Flex>
          <HelperTooltip label={translate('lending.totalCollateral')}>
            <Text translation='lending.totalCollateral' />
          </HelperTooltip>

          <Flex display={largeDisplay}>
            <HelperTooltip label={translate('lending.estCollateralizationRatio')}>
              <Text translation='lending.estCollateralizationRatio' />
            </HelperTooltip>
          </Flex>
          <Flex display={largeDisplay}>
            <HelperTooltip label={translate('lending.totalBorrowers')}>
              <Text translation='lending.totalBorrowers' />
            </HelperTooltip>
          </Flex>
        </SimpleGrid>
        <Stack mx={listMargin}>{lendingRows}</Stack>
      </Stack>
    </Main>
  )
}
