import { Card, CardBody, CardHeader, Heading, Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { AccountTable } from './components/AccountList/AccountTable'
import { DashboardChart } from './components/DashboardChart'

import { useNfts } from '@/components/Nfts/hooks/useNfts'
import { Text } from '@/components/Text'

const cardBodyPx = { base: 4, md: 2 }
const accountHeaderPaddingBottom = { base: 0, md: 4 }
const accountHeaderPaddingTop = { base: 6, md: 4 }
const stackSpacing = { base: 0, md: 6 }

export const Portfolio = memo(() => {
  // Lazily fetch NFTs once user navigates to the dashboard overview
  useNfts()

  return (
    <Stack spacing={stackSpacing} width='full'>
      <DashboardChart />
      <Card variant='dashboard'>
        <CardHeader pb={accountHeaderPaddingBottom} pt={accountHeaderPaddingTop}>
          <Heading as='h6'>
            <Text translation='dashboard.portfolio.myAssets' />
          </Heading>
        </CardHeader>
        <CardBody px={cardBodyPx} pt={0} pb={0}>
          <AccountTable />
        </CardBody>
      </Card>
    </Stack>
  )
})
