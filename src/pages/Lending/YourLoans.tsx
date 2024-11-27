import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { selectAccountNumberByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LendingHeader } from './components/LendingHeader'
import { useAllLendingPositionsData } from './hooks/useAllLendingPositionsData'
import { useLendingPositionData } from './hooks/useLendingPositionData'
import { useLendingSupportedAssets } from './hooks/useLendingSupportedAssets'
import { useRepaymentLockData } from './hooks/useRepaymentLockData'

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '200px repeat(3, 1fr)',
  xl: '200px repeat(4, 1fr)',
}
const reverseMobileDisplay = {
  base: 'block',
  lg: 'none',
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

const alignItems = {
  base: 'flex-end',
  lg: 'flex-start',
}

type LendingRowGridProps = {
  asset: Asset
  accountId: AccountId
  onPoolClick: (assetId: AssetId, accountId: AccountId) => void
}

const LendingRowGrid = ({ asset, accountId, onPoolClick }: LendingRowGridProps) => {
  const translate = useTranslate()
  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      assetId: asset.assetId,
      accountId,
    })

  const useRepaymentLockDataArgs = useMemo(
    () => ({
      assetId: asset.assetId,
      accountId,
      // When fetching position repayment lock, we want to ensure there's an AccountId and AssetId
      // or we would fetch the default network's repayment lock instead
      // these should be defined according to types but you never know
      enabled: Boolean(asset.assetId && accountId),
    }),
    [asset.assetId, accountId],
  )
  const { data: repaymentLockData, isSuccess: isRepaymentLockSuccess } =
    useRepaymentLockData(useRepaymentLockDataArgs)

  const handlePoolClick = useCallback(() => {
    onPoolClick(asset.assetId, accountId)
  }, [accountId, asset.assetId, onPoolClick])

  const accountNumberFilter = useMemo(
    () => ({ assetId: asset.assetId, accountId }),
    [accountId, asset.assetId],
  )
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, accountNumberFilter))
  const accountNumberTranslation: TextPropTypes['translation'] = useMemo(
    () => ['accounts.accountNumber', { accountNumber }],
    [accountNumber],
  )

  const isRepaymentLocked = bnOrZero(repaymentLockData).gt(0)

  if (
    lendingPositionData &&
    bnOrZero(lendingPositionData.collateralBalanceCryptoPrecision)
      .plus(lendingPositionData.debtBalanceFiatUserCurrency)
      .isZero()
  )
    return null

  return (
    <Stack mx={listMargin}>
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
        <Skeleton isLoaded={!isLendingPositionDataLoading} display={mobileDisplay}>
          <Stack spacing={0}>
            <Text translation={accountNumberTranslation} />
          </Stack>
        </Skeleton>
        <Skeleton isLoaded={!isLendingPositionDataLoading}>
          <Stack spacing={0} alignItems={alignItems}>
            <Amount.Fiat value={lendingPositionData?.debtBalanceFiatUserCurrency ?? '0'} />
            <RawText
              color={isRepaymentLocked ? 'text.subtle' : 'green.500'}
              display={reverseMobileDisplay}
              fontSize='xs'
            >
              {isRepaymentLocked
                ? translate('lending.daysUntilRepayment', { numDays: repaymentLockData })
                : translate('lending.repaymentAvailable')}
            </RawText>
          </Stack>
        </Skeleton>
        <Skeleton isLoaded={!isLendingPositionDataLoading} display={mobileDisplay}>
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
        <Skeleton isLoaded={isRepaymentLockSuccess} display={largeDisplay}>
          <RawText color={isRepaymentLocked ? 'white' : 'green.500'}>
            {isRepaymentLocked
              ? translate('lending.repaymentDays', { numDays: repaymentLockData })
              : translate('lending.unlocked')}
          </RawText>
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

  const { data: lendingSupportedAssets } = useLendingSupportedAssets({
    type: 'collateral',
  })

  const history = useHistory()

  const handlePoolClick = useCallback(
    (assetId: AssetId, accountId: AccountId) => {
      history.push(generatePath('/lending/poolAccount/:accountId/:assetId', { accountId, assetId }))
    },
    [history],
  )

  const { isActive, isLoading: isAllLendingPositionsDataLoading } = useAllLendingPositionsData()

  const lendingRowGrids = useMemo(() => {
    if (!lendingSupportedAssets) return new Array(2).fill(null).map(() => <Skeleton height={16} />)
    if (isAllLendingPositionsDataLoading) return null

    return isActive ? (
      lendingSupportedAssets.map(asset => (
        <LendingRowAssetAccountsGrids asset={asset} onPoolClick={handlePoolClick} />
      ))
    ) : (
      <ResultsEmpty
        title='lending.yourLoans.emptyTitle'
        body='lending.yourLoans.emptyBody'
        icon={emptyIcon}
      />
    )
  }, [handlePoolClick, isActive, isAllLendingPositionsDataLoading, lendingSupportedAssets])

  const renderHeader = useMemo(() => {
    return isActive ? (
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
          <HelperTooltip label={translate('assets.assetDetails.assetAccounts.account')}>
            <Text translation='assets.assetDetails.assetAccounts.account' textAlign='right' />
          </HelperTooltip>
        </Flex>

        <HelperTooltip label={translate('lending.outstandingDebtDescription')}>
          <Text translation='lending.outstandingDebt' textAlign='right' />
        </HelperTooltip>

        <Flex display={mobileDisplay}>
          <HelperTooltip label={translate('lending.collateralValueDescription')}>
            <Text translation='lending.collateralValue' textAlign='right' />
          </HelperTooltip>
        </Flex>
        <Flex display={largeDisplay}>
          <HelperTooltip label={translate('lending.repaymentLockDescription')}>
            <Text translation='lending.repaymentLock' textAlign='right' />
          </HelperTooltip>
        </Flex>
      </SimpleGrid>
    ) : null
  }, [isActive, translate])

  return (
    <Main headerComponent={lendingHeader} isSubPage>
      <SEO title={translate('lending.yourLoans.yourLoans')} />
      <Stack>
        {renderHeader}
        {lendingRowGrids}
      </Stack>
    </Main>
  )
}
