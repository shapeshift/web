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
import { btcAssetId, btcChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useParams } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { fromThorBaseUnit } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectFirstAccountIdByChainId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
        <IconButton icon={backIcon} aria-label='Back to lending' onClick={handleBack} />
        <Heading>{translate('lending.lending')}</Heading>
      </Flex>
    </Container>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }

// TODO(gomes): programmatic
const assetId = btcAssetId

export const Pool = () => {
  const { pid } = useParams<{ pid?: string }>()
  const translate = useTranslate()
  const [value, setValue] = useState<number | string>()

  const sellAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, btcChainId)) ?? ''
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const { data: lendingPositionData, isLoading } = useQuery({
    queryKey: ['lendingPosition', { assetId, accountId }],
    queryFn: async ({ queryKey }) => {
      const [_key, { accountId, assetId }] = queryKey
      const position = await getThorchainLendingPosition({ accountId, assetId })
      return position
    },
    select: data => {
      // defaults all field in case no position is found
      const collateralBalanceCryptoPrecision = fromThorBaseUnit(data?.debt_current).toString()
      const debtBalanceCryptoPrecision = fromThorBaseUnit(data?.debt_current).toString()

      const collateralBalanceFiatUserCurrency = fromThorBaseUnit(data?.debt_current)
        .times(sellAssetMarketData.price)
        .toString()
      const debtBalanceFiatUserCurrency = fromThorBaseUnit(data?.debt_current)
        .times(sellAssetMarketData.price)
        .toString()

      return {
        collateralBalanceCryptoPrecision,
        debtBalanceCryptoPrecision,
        collateralBalanceFiatUserCurrency,
        debtBalanceFiatUserCurrency,
      }
    },
    enabled: Boolean(accountId && assetId && sellAssetMarketData.price !== '0'),
  })

  console.log({ lendingPositionData })

  const headerComponent = useMemo(() => <PoolHeader />, [])

  const collateralBalanceComponent = useMemo(
    () => (
      <Amount.Crypto
        fontSize='2xl'
        value={lendingPositionData?.collateralBalanceCryptoPrecision ?? '0'}
        symbol='BTC'
        fontWeight='medium'
      />
    ),
    [lendingPositionData?.collateralBalanceCryptoPrecision],
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
        value={lendingPositionData?.debtBalanceFiatUserCurrency ?? '0'}
        fontWeight='medium'
      />
    ),
    [lendingPositionData?.debtBalanceFiatUserCurrency],
  )
  const repaymentLockComponent = useMemo(
    () => (
      <RawText fontSize='2xl' fontWeight='medium'>
        20 days
      </RawText>
    ),
    [],
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
                <AssetIcon assetId={assetId} />
                <Heading as='h3'>Bitcoin</Heading>
                <RawText>{pid}</RawText>
              </Flex>
            </CardHeader>
            <CardBody gap={8} display='flex' flexDir='column' px={8} pb={8} pt={0}>
              <Text translation='lending.myLoanInformation' fontWeight='medium' />
              <Flex>
                <DynamicComponent
                  label='lending.collateralBalance'
                  toolTipLabel='tbd'
                  component={collateralBalanceComponent}
                  isLoading={isLoading}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
                <DynamicComponent
                  label='lending.collateralValue'
                  toolTipLabel='tbd'
                  component={collateralValueComponent}
                  isLoading={isLoading}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
              </Flex>
              <Flex>
                <DynamicComponent
                  label='lending.debtBalance'
                  toolTipLabel='tbd'
                  component={debtBalanceComponent}
                  isLoading={isLoading}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
                <DynamicComponent
                  label='lending.repaymentLock'
                  toolTipLabel='tbd'
                  component={repaymentLockComponent}
                  isLoading={isLoading}
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
              <PoolInfo />
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
                  <Borrow />
                </TabPanel>
                <TabPanel px={0} py={0}>
                  <Repay />
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
