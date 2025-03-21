import { Card, CardBody, CardHeader, Heading, Stack } from '@chakra-ui/react'
import { memo, useDeferredValue, useEffect, useState } from 'react'

import { AccountTable } from './components/AccountList/AccountTable'
import { AccountTableSkeleton } from './components/AccountTableSkeleton'
import { DashboardChart } from './components/DashboardChart'
import { DashboardChartSkeleton } from './components/DashboardChartSkeleton'

import { useNfts } from '@/components/Nfts/hooks/useNfts'
import { Text } from '@/components/Text'

const cardBodyPx = { base: 4, md: 2 }
const accountHeaderPaddingBottom = { base: 0, md: 4 }
const accountHeaderPaddingTop = { base: 6, md: 4 }
const stackSpacing = { base: 0, md: 6 }

export const Portfolio = memo(() => {
  const [isMounted, setIsMounted] = useState(false)

  const shouldRenderChart = useDeferredValue(isMounted)
  const shouldRenderAccountsTable = useDeferredValue(shouldRenderChart)

  useEffect(() => {
    // Seems useless, but ensures this is set on next tick (which isn't available on browsers)
    const timerId = setTimeout(() => {
      setIsMounted(true)
    }, 0)

    return () => clearTimeout(timerId)
  }, [])

  // Lazily fetch NFTs once user navigates to the dashboard overview
  useNfts()

  return (
    <Stack spacing={stackSpacing} width='full'>
      {shouldRenderChart ? <DashboardChart /> : <DashboardChartSkeleton />}

      <Card variant='dashboard'>
        <CardHeader pb={accountHeaderPaddingBottom} pt={accountHeaderPaddingTop}>
          <Heading as='h6'>
            <Text translation='dashboard.portfolio.myAssets' />
          </Heading>
        </CardHeader>
        <CardBody px={cardBodyPx} pt={0} pb={0}>
          {shouldRenderAccountsTable ? <AccountTable /> : <AccountTableSkeleton />}
        </CardBody>
      </Card>
    </Stack>
  )
})
