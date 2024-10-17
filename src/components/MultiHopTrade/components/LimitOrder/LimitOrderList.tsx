import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react'
import type { FC } from 'react'
import { RawText, Text } from 'components/Text'

type LimitOrderListProps = {
  isLoading: boolean
} & CardProps

export const LimitOrderList: FC<LimitOrderListProps> = ({ isLoading, ...cardProps }) => {
  return (
    <Card {...cardProps}>
      <CardHeader px={6} pt={4}>
        <Heading textAlign='center' fontSize='md'>
          <Text translation='limitOrders.listTitle' />
        </Heading>
      </CardHeader>
      <CardBody px={0} overflowY='auto' flex='1 1 auto'>
        <RawText>TODO</RawText>
      </CardBody>
    </Card>
  )
}
