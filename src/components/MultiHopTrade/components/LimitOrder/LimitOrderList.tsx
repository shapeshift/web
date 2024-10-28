import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { usdcAssetId } from 'test/mocks/accounts'
import { Text } from 'components/Text'

import { LimitOrderCard } from './components/LimitOrderCard'
import { LimitOrderStatus } from './types'

type LimitOrderListProps = {
  isLoading: boolean
} & CardProps

export const LimitOrderList: FC<LimitOrderListProps> = ({ isLoading, ...cardProps }) => {
  // FIXME: Use real data
  const MockLimitOrderCard = () => (
    <LimitOrderCard
      id='1'
      sellAmount={7000000}
      buyAmount={159517.575}
      buyAssetId={usdcAssetId}
      sellAssetId={foxAssetId}
      expiry={7}
      filledDecimalPercentage={0.0888}
      status={LimitOrderStatus.Open}
    />
  )

  return (
    <Card {...cardProps}>
      <CardHeader px={6} pt={4}>
        <Heading textAlign='center' fontSize='md'>
          <Text translation='limitOrders.listTitle' />
        </Heading>
      </CardHeader>
      <CardBody px={3} overflowY='auto' flex='1 1 auto'>
        {Array.from({ length: 3 }).map((_, index) => (
          <MockLimitOrderCard key={index} />
        ))}
      </CardBody>
    </Card>
  )
}
