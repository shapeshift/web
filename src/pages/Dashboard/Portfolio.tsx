import { Card, CardBody, CardHeader, Heading, Stack } from '@chakra-ui/react'
import { memo, useEffect, useState, useTransition } from 'react'

import { TCYCta } from '../TCY/components/TCYCta'
import { AccountTable } from './components/AccountList/AccountTable'
import { AccountTableSkeleton } from './components/AccountTableSkeleton'
import { DashboardChart } from './components/DashboardChart'
import { DashboardChartSkeleton } from './components/DashboardChartSkeleton'

import { Display } from '@/components/Display'
import { Text } from '@/components/Text'

const cardBodyPx = 2
const accountHeaderPaddingBottom = { base: 0, md: 4 }
const accountHeaderPaddingTop = { base: 6, md: 4 }
const stackSpacing = { base: 0, md: 6 }

export const Portfolio = memo(() => {
  const [, startTransition] = useTransition()
  const [shouldRenderChart, setShouldRenderChart] = useState(false)
  const [shouldRenderAccountTable, setShouldRenderAccountTable] = useState(false)

  useEffect(() => {
    startTransition(() => {
      setShouldRenderChart(true)
    })
  }, [])

  useEffect(() => {
    if (shouldRenderChart) {
      startTransition(() => {
        setShouldRenderAccountTable(true)
      })
    }
  }, [shouldRenderChart])

  return (
    <>
      <Stack spacing={stackSpacing} width='full'>
        <Display.Desktop>
          {shouldRenderChart ? <DashboardChart /> : <DashboardChartSkeleton />}
          <TCYCta />
        </Display.Desktop>
        <Card variant='dashboard'>
          <Display.Desktop>
            <CardHeader pb={accountHeaderPaddingBottom} pt={accountHeaderPaddingTop}>
              <Heading as='h6'>
                <Text translation='dashboard.portfolio.myAssets' />
              </Heading>
            </CardHeader>
          </Display.Desktop>
          <CardBody px={cardBodyPx} pt={0} pb={0}>
            {shouldRenderAccountTable ? <AccountTable /> : <AccountTableSkeleton />}
          </CardBody>
        </Card>
      </Stack>
    </>
  )
})
