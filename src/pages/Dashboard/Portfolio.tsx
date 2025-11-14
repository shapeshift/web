import { Card, CardBody } from '@chakra-ui/react'
import { memo, useEffect, useState, useTransition } from 'react'

import { AccountTable } from './components/AccountList/AccountTable'
import { AccountTableSkeleton } from './components/AccountTableSkeleton'

export const Portfolio = memo(() => {
  const [, startTransition] = useTransition()
  const [shouldRenderAccountTable, setShouldRenderAccountTable] = useState(false)

  useEffect(() => {
    startTransition(() => {
      setShouldRenderAccountTable(true)
    })
  }, [])

  return (
    <Card variant='dashboard'>
      <CardBody px={2} pt={0} pb={0}>
        {shouldRenderAccountTable ? <AccountTable /> : <AccountTableSkeleton />}
      </CardBody>
    </Card>
  )
})
