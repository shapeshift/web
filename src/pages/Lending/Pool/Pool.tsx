import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue, SkeletonOptions } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useParams } from 'react-router'
import type { AmountProps } from 'components/Amount/Amount'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useLendingQuoteCloseQuery } from '../hooks/useLendingCloseQuery'
import { useLendingPositionData } from '../hooks/useLendingPositionData'
import { useLendingQuoteOpenQuery } from '../hooks/useLendingQuoteQuery'
import { useRepaymentLockData } from '../hooks/useRepaymentLockData'
import { Borrow } from './components/Borrow/Borrow'
import { Faq } from './components/Faq'
import { PoolInfo } from './components/PoolInfo'
import { DynamicComponent } from './components/PoolStat'
import { Repay } from './components/Repay/Repay'

const containerPadding = { base: 6, '2xl': 8 }
const tabSelected = { color: 'text.base' }
const maxWidth = { base: '100%', md: '450px' }
const PoolHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const handleBack = useCallback(() => {
    history.goBack()
  }, [history])
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  return (
    <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
      <Flex gap={4} alignItems='center'>
        <IconButton
          icon={backIcon}
          aria-label={translate('lending.backToLending')}
          onClick={handleBack}
        />
        <Heading>{translate('lending.lending')}</Heading>
      </Flex>
    </Container>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }

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
        {isRepaymentLocked ? `${value} days` : translate('lending.unlocked')}
      </RawText>
    </Skeleton>
  )
}

export const Pool = () => {
  const { poolAccountId } = useParams<MatchParams>()
  const [stepIndex, setStepIndex] = useState<number>(0)
  const [collateralAccountId, setCollateralAccountId] = useState<AccountId>(poolAccountId ?? '')
  const [borrowAsset, setBorrowAsset] = useState<Asset | null>(null)
  const [repaymentAsset, setRepaymentAsset] = useState<Asset | null>(null)
  const [repaymentPercent, setRepaymentPercent] = useState<number>(100)
  const [depositAmountCryptoPrecision, setDepositAmountCryptoPrecision] = useState<string | null>(
    null,
  )
  const [borrowAccountId, setBorrowAccountId] = useState<AccountId>('')
  const [repaymentAccountId, setRepaymentAccountId] = useState<AccountId>('')

  const poolAssetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))

  const translate = useTranslate()

  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      assetId: poolAssetId,
      accountId: collateralAccountId,
    })

  const useRepaymentLockDataArgs = useMemo(
    () => ({ assetId: poolAssetId, accountId: poolAccountId }),
    [poolAccountId, poolAssetId],
  )
  const { data: repaymentLock, isLoading: isRepaymentLockLoading } =
    useRepaymentLockData(useRepaymentLockDataArgs)
  const { data: defaultRepaymentLock, isSuccess: isDefaultRepaymentLockSuccess } =
    useRepaymentLockData({})

  const headerComponent = useMemo(() => <PoolHeader />, [])

  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      collateralAssetId: poolAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId: borrowAsset?.assetId ?? '',
      depositAmountCryptoPrecision: depositAmountCryptoPrecision ?? '0',
    }),
    [
      poolAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAsset?.assetId,
      depositAmountCryptoPrecision,
    ],
  )
  const { data: lendingQuoteOpenData, isSuccess: isLendingQuoteSuccess } =
    useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId: poolAssetId,
      collateralAccountId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent,
      repaymentAccountId,
    }),
    [
      collateralAccountId,
      poolAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      repaymentPercent,
    ],
  )

  const { data: lendingQuoteCloseData, isSuccess: isLendingQuoteCloseSuccess } =
    useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

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
    if (stepIndex === 0 && isLendingQuoteSuccess && lendingQuoteOpenData)
      return {
        newValue: {
          value: bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision)
            .plus(lendingQuoteOpenData?.quoteCollateralAmountCryptoPrecision)
            .toFixed(),
        },
      }
    if (stepIndex === 1 && isLendingQuoteCloseSuccess && lendingQuoteCloseData)
      return {
        newValue: {
          value: bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision)
            .minus(lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision)
            .toFixed(),
        },
      }
    return {}
  }, [
    isLendingQuoteCloseSuccess,
    isLendingQuoteSuccess,
    lendingPositionData?.collateralBalanceCryptoPrecision,
    lendingQuoteCloseData,
    lendingQuoteOpenData,
    stepIndex,
  ])

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
    if (stepIndex === 0 && lendingQuoteOpenData && lendingPositionData)
      return {
        newValue: {
          value: bnOrZero(lendingPositionData.collateralBalanceFiatUserCurrency)
            .plus(lendingQuoteOpenData.quoteCollateralAmountFiatUserCurrency)
            .toFixed(),
        },
      }
    if (stepIndex === 1 && lendingQuoteCloseData && lendingPositionData)
      return {
        newValue: {
          value: bnOrZero(lendingPositionData.collateralBalanceFiatUserCurrency)
            .minus(lendingQuoteCloseData.quoteLoanCollateralDecreaseFiatUserCurrency)
            .toFixed(),
        },
      }

    return {}
  }, [lendingPositionData, lendingQuoteCloseData, lendingQuoteOpenData, stepIndex])

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
    if (stepIndex === 0 && lendingQuoteOpenData && lendingPositionData)
      return {
        newValue: {
          value: bnOrZero(lendingPositionData.debtBalanceFiatUserCurrency)
            .plus(lendingQuoteOpenData.quoteDebtAmountUserCurrency)
            .toFixed(),
        },
      }
    if (stepIndex === 1 && lendingQuoteCloseData && lendingPositionData)
      return {
        newValue: {
          value: BigNumber.max(
            bnOrZero(lendingPositionData.debtBalanceFiatUserCurrency).minus(
              lendingQuoteCloseData.quoteDebtRepaidAmountUsd,
            ),
            0,
          ).toFixed(),
        },
      }

    return {}
  }, [lendingPositionData, lendingQuoteCloseData, lendingQuoteOpenData, stepIndex])

  const repaymentLockComponent = useMemo(
    () => (
      <RepaymentLockComponentWithValue
        value={repaymentLock ?? '0'}
        isLoaded={!isRepaymentLockLoading}
      />
    ),
    [isRepaymentLockLoading, repaymentLock],
  )

  const newRepaymentLock = useMemo(() => {
    if (
      stepIndex === 0 &&
      isLendingQuoteSuccess &&
      lendingQuoteOpenData &&
      isDefaultRepaymentLockSuccess &&
      defaultRepaymentLock
    )
      return {
        newValue: {
          value: defaultRepaymentLock,
        },
      }
    return {}
  }, [
    stepIndex,
    isLendingQuoteSuccess,
    lendingQuoteOpenData,
    isDefaultRepaymentLockSuccess,
    defaultRepaymentLock,
  ])

  return (
    <Main headerComponent={headerComponent}>
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
              <Flex>
                <DynamicComponent
                  label='lending.collateralBalance'
                  toolTipLabel='tbd'
                  component={collateralBalanceComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={1}
                  {...newCollateralCrypto}
                />
                <DynamicComponent
                  label='lending.collateralValue'
                  toolTipLabel='tbd'
                  component={collateralValueComponent}
                  isLoading={isRepaymentLockLoading}
                  flex={1}
                  {...newCollateralFiat}
                />
              </Flex>
              <Flex>
                <DynamicComponent
                  label='lending.debtBalance'
                  toolTipLabel='tbd'
                  component={debtBalanceComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={1}
                  {...newDebt}
                />
                <DynamicComponent
                  label='lending.repaymentLock'
                  toolTipLabel='tbd'
                  component={repaymentLockComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={1}
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
                    borrowAsset={borrowAsset}
                    setBorrowAsset={setBorrowAsset}
                    collateralAccountId={collateralAccountId}
                    depositAmountCryptoPrecision={depositAmountCryptoPrecision}
                    setCryptoDepositAmount={setDepositAmountCryptoPrecision}
                    borrowAccountId={borrowAccountId}
                    onCollateralAccountIdChange={setCollateralAccountId}
                    onBorrowAccountIdChange={setBorrowAccountId}
                  />
                </TabPanel>
                <TabPanel px={0} py={0}>
                  <Repay
                    collateralAccountId={collateralAccountId}
                    repaymentAsset={repaymentAsset}
                    repaymentPercent={repaymentPercent}
                    setRepaymentPercent={setRepaymentPercent}
                    setRepaymentAsset={setRepaymentAsset}
                    repaymentAccountId={repaymentAccountId}
                    onCollateralAccountIdChange={setCollateralAccountId}
                    onRepaymentAccountIdChange={setRepaymentAccountId}
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
