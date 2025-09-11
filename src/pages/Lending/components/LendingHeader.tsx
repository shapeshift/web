import {
  Alert,
  AlertDescription,
  AlertIcon,
  Card,
  CardBody,
  CardFooter,
  Container,
  Flex,
  Heading,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useAllLendingPositionsData } from '../hooks/useAllLendingPositionsData'
import { useIsLendingActive } from '../hooks/useIsLendingActive'

import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import type { ChartData } from '@/components/DonutChart/DonutChart'
import { DonutChart } from '@/components/DonutChart/DonutChart'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import type { TabItem } from '@/components/TabMenu/TabMenu'
import { TabMenu } from '@/components/TabMenu/TabMenu'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'

const responsiveFlex = { base: 'auto', lg: 1 }
const containerPaddingTop = { base: 0, md: 8 }

export const LendingHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'lending.availablePools',
        path: '/lending',
        color: 'blue',
        exact: true,
      },
      {
        label: 'lending.yourLoans.yourLoans',
        path: '/lending/loans',
        color: 'blue',
      },
    ]
  }, [])
  const { isLendingActive, isMimirLoading } = useIsLendingActive()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  const { isLoading, collateralValueUserCurrency, debtValueUserCurrency } =
    useAllLendingPositionsData()
  const ltv = bnOrZero(debtValueUserCurrency).div(collateralValueUserCurrency).toNumber()
  const donutData: ChartData[] = useMemo(() => {
    return [
      {
        name: 'Collateral',
        value: bnOrZero(collateralValueUserCurrency).toNumber(),
        color: 'green.200',
      },
      {
        name: 'Debt',
        value: bnOrZero(debtValueUserCurrency).toNumber(),
        color: 'purple.300',
      },
    ]
  }, [collateralValueUserCurrency, debtValueUserCurrency])

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('lending.lending')}</PageHeader.Title>
          </PageHeader.Middle>
        </PageHeader>
      </Display.Mobile>
      <Stack mb={4}>
        <Container maxWidth='container.3xl' pt={containerPaddingTop} pb={4}>
          <Display.Desktop>
            <Stack>
              <Heading>{translate('lending.lending')}</Heading>
              <Text color='text.subtle' translation='lending.lendingBody' />
            </Stack>
          </Display.Desktop>
          <Flex gap={4} my={6} flexWrap='wrap'>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat
                    value={collateralValueUserCurrency}
                    fontSize='4xl'
                    fontWeight='bold'
                  />
                </Skeleton>
                <Text
                  color='text.success'
                  fontWeight='medium'
                  translation='lending.collateralValue'
                />
              </CardBody>
            </Card>
            <Card flex={responsiveFlex}>
              <CardBody>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Fiat value={debtValueUserCurrency} fontSize='4xl' fontWeight='bold' />
                </Skeleton>
                <Text color='purple.300' fontWeight='medium' translation='lending.debtValue' />
              </CardBody>
            </Card>
            <Card
              flex={responsiveFlex}
              flexDir='row'
              justifyContent='space-between'
              alignItems='center'
            >
              <CardBody>
                <Amount.Percent value={ltv} fontSize='4xl' fontWeight='bold' />
                <Text color='text.subtle' fontWeight='medium' translation='lending.loanToValue' />
              </CardBody>
              <CardFooter>
                <DonutChart width={45} height={45} data={donutData} />
              </CardFooter>
            </Card>
          </Flex>

          {!isLendingActive && !isMimirLoading ? (
            <Alert status='warning' variant='subtle'>
              <AlertIcon />
              <AlertDescription>{translate('lending.haltedAlert')}</AlertDescription>
            </Alert>
          ) : null}
        </Container>
        <TabMenu items={NavItems} />
      </Stack>
    </>
  )
}
