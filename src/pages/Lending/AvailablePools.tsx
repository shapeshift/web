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
import { useLendingSupportedAssets } from './hooks/useLendingSupportedAssets'
import { usePoolDataQuery } from './hooks/usePoolDataQuery'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

type LendingPoolButtonProps = {
  asset: Asset
  onPoolClick: (assetId: AssetId) => void
}

const LendingPoolButton = ({ asset, onPoolClick }: LendingPoolButtonProps) => {
  const usePoolDataArgs = useMemo(() => ({ poolAssetId: asset.assetId }), [asset.assetId])
  const { data: poolData, isLoading: isPoolDataLoading } = usePoolDataQuery(usePoolDataArgs)

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
      <Skeleton isLoaded={!isPoolDataLoading}>
        <Flex>
          <Tag colorScheme='green'>
            <TagLeftIcon as={CheckCircleIcon} />
            Healthy
          </Tag>
        </Flex>
      </Skeleton>
      <Skeleton isLoaded={!isPoolDataLoading}>
        <Amount.Fiat value={poolData?.totalDebtUserCurrency ?? '0'} />
      </Skeleton>
      <Skeleton isLoaded={!isPoolDataLoading}>
        <Amount.Crypto
          value={poolData?.totalCollateralCryptoPrecision ?? '0'}
          symbol={asset.symbol}
        />
      </Skeleton>
      <Skeleton isLoaded={!isPoolDataLoading}>
        <Amount.Percent value={poolData?.collateralizationRatioPercentDecimal ?? '0'} />
      </Skeleton>
      <Skeleton isLoaded={!isPoolDataLoading}>
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
        >
          <Text translation='lending.pool' />
          <HelperTooltip label={translate('lending.poolDepth')}>
            <Text translation='lending.poolDepth' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.totalDebtBalance')}>
            <Text translation='lending.totalDebtBalance' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.totalCollateral')}>
            <Text translation='lending.totalCollateral' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.estCollateralizationRatio')}>
            <Text translation='lending.estCollateralizationRatio' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.totalBorrowers')}>
            <Text translation='lending.totalBorrowers' />
          </HelperTooltip>
        </SimpleGrid>
        <Stack mx={-4}>{lendingRows}</Stack>
      </Stack>
    </Main>
  )
}
