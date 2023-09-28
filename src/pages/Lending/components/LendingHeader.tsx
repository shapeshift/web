import { Card, CardBody, CardFooter, Container, Flex, Heading, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { DonutChart } from 'components/DonutChart/DonutChart'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { RawText } from 'components/Text'
import type { TabItem } from 'pages/Dashboard/components/DashboardHeader'

const containerPadding = { base: 6, '2xl': 8 }

export const LendingHeader = () => {
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
          <Heading>Lending</Heading>
          <RawText color='text.subtle'>
            A listing of all pools that can be borrowed at zero-interest and zero liquidations.
          </RawText>
        </Stack>
        <Flex gap={4} my={6} mx={-4}>
          <Card flex={1}>
            <CardBody>
              <Amount.Fiat value='0' fontSize='4xl' fontWeight='bold' />
              <RawText color='text.success' fontWeight='medium'>
                Collateral Value
              </RawText>
            </CardBody>
          </Card>
          <Card flex={1}>
            <CardBody>
              <Amount.Fiat value='0' fontSize='4xl' fontWeight='bold' />
              <RawText color='purple.300' fontWeight='medium'>
                Debt Value
              </RawText>
            </CardBody>
          </Card>
          <Card flex={1} flexDir='row' justifyContent='space-between' alignItems='center'>
            <CardBody>
              <Amount.Percent value='0' fontSize='4xl' fontWeight='bold' />
              <RawText color='text.subtle' fontWeight='medium'>
                Loan to Value
              </RawText>
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
