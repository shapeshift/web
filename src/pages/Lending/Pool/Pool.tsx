import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  IconButton,
  Input,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useParams } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useLendingPositionData } from '../hooks/useLendingPositionData'
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
export const Pool = () => {
  const { poolAccountId } = useParams<MatchParams>()
  const [collateralAccountId, setCollateralAccountId] = useState<AccountId>(poolAccountId ?? '')
  const [borrowAccountId, setBorrowAccountId] = useState<AccountId>('')
  const [repaymentAccountId, setRepaymentAccountId] = useState<AccountId>('')

  const poolAssetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))

  const translate = useTranslate()
  const [value, setValue] = useState<number | string>()

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, poolAssetId))

  const repaymentLockQueryKey = useMemo(() => ['thorchainLendingRepaymentLock'], [])

  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      assetId: poolAssetId,
      accountId: collateralAccountId,
    })
  const { data: repaymentLock, isLoading: isRepaymentLockLoading } = useQuery({
    staleTime: Infinity,
    queryKey: repaymentLockQueryKey,
    queryFn: async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const { data: mimir } = await axios.get<Record<string, unknown>>(
        `${daemonUrl}/lcd/thorchain/mimir`,
      )
      // TODO(gomes): this is the repayment lock of the pool - not the borrower's
      // we will want to make it programmatic in case there's an active position.
      // https://dev.thorchain.org/thorchain-dev/lending/quick-start-guide
      if ('LOANREPAYMENTMATURITY' in mimir) return mimir.LOANREPAYMENTMATURITY as number
      return null
    },
    select: data => {
      if (!data) return null
      // Current blocktime as per https://thorchain.network/stats
      const thorchainBlockTime = '6.09'
      return bnOrZero(data)
        .times(thorchainBlockTime)
        .div(60 * 60 * 24)
        .toString()
    },
    enabled: Boolean(poolAssetId && poolAssetMarketData.price !== '0'),
  })

  const headerComponent = useMemo(() => <PoolHeader />, [])

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
  const debtBalanceComponent = useMemo(
    () => (
      <Amount.Fiat
        fontSize='2xl'
        value={lendingPositionData?.debtBalanceFiatUSD ?? '0'}
        fontWeight='medium'
      />
    ),
    [lendingPositionData?.debtBalanceFiatUSD],
  )
  const repaymentLockComponent = useMemo(
    () => (
      <RawText fontSize='2xl' fontWeight='medium'>
        {repaymentLock ?? '0'} days
      </RawText>
    ),
    [repaymentLock],
  )
  const handleValueChange = useCallback((value: React.ChangeEvent<HTMLInputElement>) => {
    setValue(value.target.value)
  }, [])
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
                  {...(value ? { newValue: { value } } : {})}
                />
                <DynamicComponent
                  label='lending.collateralValue'
                  toolTipLabel='tbd'
                  component={collateralValueComponent}
                  isLoading={isRepaymentLockLoading}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
              </Flex>
              <Flex>
                <DynamicComponent
                  label='lending.debtBalance'
                  toolTipLabel='tbd'
                  component={debtBalanceComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
                <DynamicComponent
                  label='lending.repaymentLock'
                  toolTipLabel='tbd'
                  component={repaymentLockComponent}
                  isLoading={isLendingPositionDataLoading}
                  flex={1}
                  {...(value ? { newValue: { children: '30 days' } } : {})}
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
            <Tabs variant='unstyled'>
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
                    collateralAccountId={collateralAccountId}
                    borrowAccountId={borrowAccountId}
                    onCollateralAccountIdChange={setCollateralAccountId}
                    onBorrowAccountIdChange={setBorrowAccountId}
                  />
                </TabPanel>
                <TabPanel px={0} py={0}>
                  <Repay
                    collateralAccountId={collateralAccountId}
                    repaymentAccountId={repaymentAccountId}
                    onCollateralAccountIdChange={setCollateralAccountId}
                    onRepaymentAccountIdChange={setRepaymentAccountId}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
            <Stack px={4} py={2}>
              <Input value={value} onChange={handleValueChange} />
            </Stack>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}
