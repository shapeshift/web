import type { CardProps } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardHeader,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { usdcAssetId } from 'test/mocks/accounts'
import { Text } from 'components/Text'

import { LimitOrderCard } from './components/LimitOrderCard'
import { LimitOrderStatus } from './types'

type LimitOrderListProps = {
  isLoading: boolean
} & CardProps

const textColorBaseProps = {
  color: 'text.base',
}

export const LimitOrderList: FC<LimitOrderListProps> = ({ isLoading, ...cardProps }) => {
  // FIXME: Use real data
  const MockOpenOrderCard = () => (
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

  const MockHistoryOrderCard = () => (
    <LimitOrderCard
      id='2'
      sellAmount={5000000}
      buyAmount={120000.0}
      buyAssetId={usdcAssetId}
      sellAssetId={foxAssetId}
      expiry={0}
      filledDecimalPercentage={1.0}
      status={LimitOrderStatus.Filled}
    />
  )

  return (
    <Card {...cardProps}>
      <CardHeader px={6} pt={4}>
        <Tabs variant='unstyled'>
          <TabList gap={4}>
            <Tab
              p={0}
              fontSize='md'
              fontWeight='bold'
              color='text.subtle'
              _selected={textColorBaseProps}
            >
              <Text translation='limitOrders.openOrders' />
            </Tab>
            <Tab
              p={0}
              fontSize='md'
              fontWeight='bold'
              color='text.subtle'
              _selected={textColorBaseProps}
            >
              <Text translation='limitOrders.orderHistory' />
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {Array.from({ length: 3 }).map((_, index) => (
                  <MockOpenOrderCard key={index} />
                ))}
              </CardBody>
            </TabPanel>

            <TabPanel px={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {Array.from({ length: 2 }).map((_, index) => (
                  <MockHistoryOrderCard key={index} />
                ))}
              </CardBody>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardHeader>
    </Card>
  )
}
