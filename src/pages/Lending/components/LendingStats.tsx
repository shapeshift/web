import { Card, CardBody, CardFooter, Container, Flex, Skeleton } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { DonutChart } from 'components/DonutChart/DonutChart'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { useAllLendingPositionsData } from '../hooks/useAllLendingPositionsData'

const containerPadding = { base: 6, '2xl': 0 }
const responsiveFlex = { base: 'auto', lg: 1 }

export const LendingStats = () => {
  const { isLoading, collateralValueUserCurrency, debtValueUserCurrency } =
    useAllLendingPositionsData()
  const ltv = bnOrZero(debtValueUserCurrency).div(collateralValueUserCurrency).toNumber()
  return (
    <Container maxWidth='container.4xl' px={containerPadding}>
      <Flex gap={4} mx={-4} flexWrap='wrap'>
        <Card flex={responsiveFlex}>
          <CardBody>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Fiat value={collateralValueUserCurrency} fontSize='4xl' fontWeight='bold' />
            </Skeleton>
            <Text color='text.success' fontWeight='medium' translation='lending.collateralValue' />
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
            <DonutChart width={45} height={45} />
          </CardFooter>
        </Card>
      </Flex>
    </Container>
  )
}
