import type { ResponsiveValue, SkeletonOptions } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMutationState } from '@tanstack/react-query'
import type { Property } from 'csstype'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useParams, useRouteMatch } from 'react-router'
import type { AmountProps } from 'components/Amount/Amount'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Display } from 'components/Display'
import { DynamicComponent } from 'components/DynamicComponent'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import type { LendingQuoteClose, LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { isLendingQuoteClose, isLendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useLendingPositionData } from '../hooks/useLendingPositionData'
import { useRepaymentLockData } from '../hooks/useRepaymentLockData'
import { Borrow } from './components/Borrow/Borrow'
import { Faq } from './components/Faq'
import { PoolInfo } from './components/PoolInfo'
import { Repay } from './components/Repay/Repay'

const tabSelected = { color: 'text.base' }
const maxWidth = { base: '100%', md: '450px' }
const responsiveFlex = { base: 'auto', lg: 1 }

type PoolHeaderProps = {
  assetId?: AssetId
}
const PoolHeader: React.FC<PoolHeaderProps> = ({ assetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const translate = useTranslate()
  const history = useHistory()
  const { path } = useRouteMatch()
  const handleBack = useCallback(() => {
    const isPoolPage = matchPath('/lending/pool/:poolAssetId', path)
    const isPoolAccountPage = matchPath('/lending/poolAccount/:poolAccountId/:poolAssetId', path)

    if (isPoolAccountPage) {
      history.push('/lending/loans')
    } else if (isPoolPage) {
      history.push('/lending')
    }
  }, [history, path])

  if (!asset) return null

  return (
    <PageHeader>
      <PageHeader.Left>
        <PageBackButton onBack={handleBack} />
        <Display.Desktop>
          <PageHeader.Title>{translate('lending.lending')}</PageHeader.Title>
        </Display.Desktop>
      </PageHeader.Left>
      <Display.Mobile>
        <PageHeader.Middle>
          <PageHeader.Title>
            {asset.name} {translate('lending.lending')}
          </PageHeader.Title>
        </PageHeader.Middle>
      </Display.Mobile>
    </PageHeader>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }

type MatchParams = {
  poolAccountId?: AccountId
}

// Since dynamic components react on the `value` property, this wrappers ensures the repayment lock
// component accepts it as a prop, vs. <Skeleton /> being the outermost component if not using a wrapper
const RepaymentLockComponentWithValue = ({ isLoaded, value }: AmountProps & SkeletonOptions) => {
  const isRepaymentLocked = bnOrZero(value).gt(0)

  const translate = useTranslate()

  return (
    <Skeleton isLoaded={isLoaded}>
      <RawText color={isRepaymentLocked ? 'white' : 'green.500'} fontSize='2xl' fontWeight='medium'>
        {isRepaymentLocked
          ? translate('lending.repaymentDays', { numDays: value })
          : translate('lending.unlocked')}
      </RawText>
    </Skeleton>
  )
}

export const Pool = () => {
  const { poolAccountId } = useParams<MatchParams>()
  const [stepIndex, setStepIndex] = useState<number>(0)
  const [borrowTxid, setBorrowTxid] = useState<string | null>(null)
  const [confirmedQuote, setConfirmedQuote] = useState<LendingQuoteOpen | LendingQuoteClose | null>(
    null,
  )
  const [repayTxid, setRepayTxid] = useState<string | null>(null)
  const [collateralAccountId, setCollateralAccountId] = useState<AccountId | null>(
    poolAccountId ?? null,
  )
  const [borrowAsset, setBorrowAsset] = useState<Asset | null>(null)
  const [repaymentAsset, setRepaymentAsset] = useState<Asset | null>(null)
  const [repaymentPercent, setRepaymentPercent] = useState<number>(100)
  const [depositAmountCryptoPrecision, setDepositAmountCryptoPrecision] = useState<string | null>(
    null,
  )
  const [borrowAccountId, setBorrowAccountId] = useState<AccountId>('')
  const [repaymentAccountId, setRepaymentAccountId] = useState<AccountId | null>(null)

  const poolAssetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))

  const translate = useTranslate()

  const useRepaymentLockDataArgs = useMemo(
    () => ({
      assetId: poolAssetId,
      accountId: collateralAccountId,
      // When fetching position repayment lock, we want to ensure there's an AccountId and AssetId
      // or we would fetch the default network's repayment lock instead
      enabled: Boolean(poolAssetId && collateralAccountId),
    }),
    [collateralAccountId, poolAssetId],
  )
  const { data: positionRepaymentLock, isSuccess: isPositionRepaymentLockSuccess } =
    useRepaymentLockData(useRepaymentLockDataArgs)
  const { data: defaultRepaymentLock, isSuccess: isDefaultRepaymentLockSuccess } =
    useRepaymentLockData({})

  const headerComponent = useMemo(() => <PoolHeader assetId={poolAssetId} />, [poolAssetId])

  const borrowMutationStatus = useMutationState({
    filters: { mutationKey: [borrowTxid] },
    select: mutation => mutation.state.status,
  })
  const isBorrowUpdated = borrowMutationStatus?.[0] === 'success'

  const repayMutationStatus = useMutationState({
    filters: { mutationKey: [repayTxid] },
    select: mutation => mutation.state.status,
  })
  const isRepayUpdated = repayMutationStatus?.[0] === 'success'

  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      assetId: poolAssetId,
      accountId: collateralAccountId,
    })

  const collateralBalanceComponent = useMemo(
    () => (
      <Amount.Crypto
        fontSize='2xl'
        value={lendingPositionData?.collateralBalanceCryptoPrecision ?? '0'}
        symbol={asset?.symbol ?? ''}
        fontWeight='medium'
      />
    ),
    [asset?.symbol, lendingPositionData?.collateralBalanceCryptoPrecision],
  )
  const newCollateralCrypto = useMemo(() => {
    if (confirmedQuote && (isBorrowUpdated || isRepayUpdated)) return {}

    if (stepIndex === 0 && lendingPositionData && isLendingQuoteOpen(confirmedQuote))
      return {
        newValue: {
          value: bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision)
            .plus(confirmedQuote.quoteCollateralAmountCryptoPrecision)
            .toFixed(),
        },
      }
    if (stepIndex === 1 && lendingPositionData && isLendingQuoteClose(confirmedQuote))
      return {
        newValue: {
          value: bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision)
            .minus(confirmedQuote.quoteLoanCollateralDecreaseCryptoPrecision)
            .toFixed(),
        },
      }
    return {}
  }, [confirmedQuote, isBorrowUpdated, isRepayUpdated, stepIndex, lendingPositionData])

  const collateralValueComponent = useMemo(
    () => (
      <Amount.Fiat
        fontSize='2xl'
        value={lendingPositionData?.collateralBalanceFiatUserCurrency ?? '0'}
        fontWeight='medium'
      />
    ),
    [lendingPositionData?.collateralBalanceFiatUserCurrency],
  )

  const newCollateralFiat = useMemo(() => {
    if (confirmedQuote && (isBorrowUpdated || isRepayUpdated)) return {}

    if (stepIndex === 0 && lendingPositionData && isLendingQuoteOpen(confirmedQuote))
      return {
        newValue: {
          value: bnOrZero(lendingPositionData.collateralBalanceFiatUserCurrency)
            .plus(confirmedQuote.quoteCollateralAmountFiatUserCurrency)
            .toFixed(),
        },
      }
    if (stepIndex === 1 && lendingPositionData && isLendingQuoteClose(confirmedQuote))
      return {
        newValue: {
          value: bnOrZero(lendingPositionData.collateralBalanceFiatUserCurrency)
            .minus(confirmedQuote.quoteLoanCollateralDecreaseFiatUserCurrency)
            .toFixed(),
        },
      }

    return {}
  }, [confirmedQuote, isBorrowUpdated, isRepayUpdated, lendingPositionData, stepIndex])

  const debtBalanceComponent = useMemo(
    () => (
      <Amount.Fiat
        fontSize='2xl'
        value={lendingPositionData?.debtBalanceFiatUserCurrency ?? '0'}
        fontWeight='medium'
      />
    ),
    [lendingPositionData?.debtBalanceFiatUserCurrency],
  )

  const newDebt = useMemo(() => {
    if (confirmedQuote && (isBorrowUpdated || isRepayUpdated)) return {}

    if (stepIndex === 0 && lendingPositionData && isLendingQuoteOpen(confirmedQuote))
      return {
        newValue: {
          value: bnOrZero(lendingPositionData.debtBalanceFiatUserCurrency)
            .plus(confirmedQuote.quoteDebtAmountUserCurrency)
            .toFixed(),
        },
      }
    if (stepIndex === 1 && lendingPositionData && isLendingQuoteClose(confirmedQuote))
      return {
        newValue: {
          value: BigNumber.max(
            bnOrZero(lendingPositionData.debtBalanceFiatUserCurrency).minus(
              confirmedQuote.quoteDebtRepaidAmountUserCurrency,
            ),
            0,
          ).toFixed(),
        },
      }

    return {}
  }, [confirmedQuote, isBorrowUpdated, isRepayUpdated, lendingPositionData, stepIndex])

  const repaymentLockComponent = useMemo(
    () => (
      <RepaymentLockComponentWithValue
        value={positionRepaymentLock ?? '0'}
        isLoaded={isPositionRepaymentLockSuccess}
      />
    ),
    [isPositionRepaymentLockSuccess, positionRepaymentLock],
  )

  const newRepaymentLock = useMemo(() => {
    if (confirmedQuote && (isBorrowUpdated || isRepayUpdated)) return {}

    if (stepIndex === 0 && confirmedQuote && isDefaultRepaymentLockSuccess && defaultRepaymentLock)
      return {
        newValue: {
          value: defaultRepaymentLock,
        },
      }
    return {}
  }, [
    confirmedQuote,
    isBorrowUpdated,
    isRepayUpdated,
    stepIndex,
    isDefaultRepaymentLockSuccess,
    defaultRepaymentLock,
  ])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Card>
            <CardHeader px={8} py={8}>
              <Flex gap={4} alignItems='center'>
                <AssetIcon assetId={poolAssetId} />
                <Heading as='h3'>{asset?.name ?? ''}</Heading>
              </Flex>
            </CardHeader>
            <CardBody gap={8} display='flex' flexDir='column' px={8} pb={8} pt={0}>
              <Text translation='lending.myLoanInformation' fontWeight='medium' />
              <Flex gap={4} flexWrap='wrap'>
                <DynamicComponent
                  label='lending.collateralBalance'
                  toolTipLabel={translate('lending.collateralBalanceDescription')}
                  component={collateralBalanceComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={responsiveFlex}
                  {...newCollateralCrypto}
                />
                <DynamicComponent
                  label='lending.collateralValue'
                  toolTipLabel={translate('lending.collateralValueDescription')}
                  component={collateralValueComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={responsiveFlex}
                  {...newCollateralFiat}
                />
              </Flex>
              <Flex gap={4} flexWrap='wrap'>
                <DynamicComponent
                  label='lending.debtBalance'
                  toolTipLabel={translate('lending.debtBalanceDescription')}
                  component={debtBalanceComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={responsiveFlex}
                  {...newDebt}
                />
                <DynamicComponent
                  label='lending.repaymentLock'
                  toolTipLabel={translate('lending.repaymentLockDescription')}
                  component={repaymentLockComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={responsiveFlex}
                  {...newRepaymentLock}
                />
              </Flex>
            </CardBody>
            <CardFooter
              gap={8}
              display='flex'
              flexDir='column'
              px={8}
              py={8}
              borderTopWidth={1}
              borderColor='border.base'
            >
              <PoolInfo poolAssetId={poolAssetId} />
            </CardFooter>
          </Card>
          <Faq />
        </Stack>
        <Stack flex={1} maxWidth={maxWidth}>
          <Card>
            <Tabs onChange={setStepIndex} variant='unstyled'>
              <TabList px={2} py={4}>
                <Tab color='text.subtle' fontWeight='bold' _selected={tabSelected}>
                  {translate('lending.borrow')}
                </Tab>
                <Tab color='text.subtle' fontWeight='bold' _selected={tabSelected}>
                  {translate('lending.repay')}
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0} py={0}>
                  <Borrow
                    isAccountSelectionDisabled={Boolean(poolAccountId)}
                    borrowAsset={borrowAsset}
                    setBorrowAsset={setBorrowAsset}
                    collateralAccountId={collateralAccountId ?? ''}
                    depositAmountCryptoPrecision={depositAmountCryptoPrecision}
                    setCryptoDepositAmount={setDepositAmountCryptoPrecision}
                    borrowAccountId={borrowAccountId}
                    onCollateralAccountIdChange={setCollateralAccountId}
                    onBorrowAccountIdChange={setBorrowAccountId}
                    txId={borrowTxid}
                    setTxid={setBorrowTxid}
                    confirmedQuote={isLendingQuoteOpen(confirmedQuote) ? confirmedQuote : null}
                    setConfirmedQuote={setConfirmedQuote}
                  />
                </TabPanel>
                <TabPanel px={0} py={0}>
                  <Repay
                    isAccountSelectionDisabled={Boolean(poolAccountId)}
                    collateralAccountId={collateralAccountId}
                    repaymentAsset={repaymentAsset}
                    repaymentPercent={repaymentPercent}
                    setRepaymentPercent={setRepaymentPercent}
                    setRepaymentAsset={setRepaymentAsset}
                    repaymentAccountId={repaymentAccountId}
                    onCollateralAccountIdChange={setCollateralAccountId}
                    onRepaymentAccountIdChange={setRepaymentAccountId}
                    txId={repayTxid}
                    setTxid={setRepayTxid}
                    confirmedQuote={isLendingQuoteClose(confirmedQuote) ? confirmedQuote : null}
                    setConfirmedQuote={setConfirmedQuote}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}
