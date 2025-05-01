import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react'

import { TransactionRow } from './TransactionRow'

export const Activity = () => {
  return (
    <Card>
      <CardHeader>
        <Heading size='sm'>Activity</Heading>
      </CardHeader>
      <CardBody>
        <TransactionRow />
      </CardBody>
    </Card>
  )
}
