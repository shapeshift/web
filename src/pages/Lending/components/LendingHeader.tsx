import { Card, CardBody, CardFooter, Container, Flex, Heading, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { DonutChart } from 'components/DonutChart/DonutChart'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { Text } from 'components/Text'
import type { TabItem } from 'pages/Dashboard/components/DashboardHeader'

const containerPadding = { base: 6, '2xl': 8 }

export const LendingHeader = () => {
  const translate = useTranslate()
  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'lending.availablePools',
        path: '/lending',
        color: 'blue',
        exact: true,
      },
      {
        label: 'lending.yourLoans',
        path: '/lending/loans',
        color: 'blue',
        rightElement: <Amount.Fiat value='0' />,
      },
    ]
  }, [])
  return (
    <Stack>
      <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
        <Stack>
          <Heading>{translate('lending.lending')}</Heading>
          <Text color='text.subtle' translation='lending.lendingBody' />
        </Stack>
        <Flex gap={4} my={6} mx={-4}>
          <Card flex={1}>
            <CardBody>
              <Amount.Fiat value='0' fontSize='4xl' fontWeight='bold' />
              <Text
                color='text.success'
                fontWeight='medium'
                translation='lending.collateralValue'
              />
            </CardBody>
          </Card>
          <Card flex={1}>
            <CardBody>
              <Amount.Fiat value='0' fontSize='4xl' fontWeight='bold' />
              <Text color='purple.300' fontWeight='medium' translation='lending.debtValue' />
            </CardBody>
          </Card>
          <Card flex={1} flexDir='row' justifyContent='space-between' alignItems='center'>
            <CardBody>
              <Amount.Percent value='0' fontSize='4xl' fontWeight='bold' />
              <Text color='text.subtle' fontWeight='medium' translation='lending.loanToValue' />
            </CardBody>
            <CardFooter>
              <DonutChart width={45} height={45} />
            </CardFooter>
          </Card>
        </Flex>
      </Container>
      <TabMenu items={NavItems} />
    </Stack>
  )
}
