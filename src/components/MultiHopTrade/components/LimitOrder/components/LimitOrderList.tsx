import type { CardProps } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardHeader,
  Center,
  Flex,
  Heading,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { cowSwapTokenToAssetId } from '@shapeshiftoss/swapper'
import { OrderClass, OrderStatus, SigningScheme } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { partition } from 'lodash'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Text } from 'components/Text'

import { WithBackButton } from '../../WithBackButton'
import { useGetLimitOrdersQuery } from '../hooks/useGetLimitOrdersForAccountQuery'
import type { OrderToCancel } from '../types'
import { CancelLimitOrder } from './CancelLimtOrder'
import { LimitOrderCard } from './LimitOrderCard'

const textSelectedProps = {
  color: 'text.base',
}

type LimitOrderListProps = {
  isLoading: boolean
  cardProps?: CardProps
  onBack?: () => void
}

export const LimitOrderList: FC<LimitOrderListProps> = ({ cardProps, onBack }) => {
  const [orderToCancel, setOrderToCancel] = useState<OrderToCancel>()
  const { data: ordersResponse, isLoading } = useGetLimitOrdersQuery()

  const [openLimitOrders, historicalLimitOrders] = useMemo(() => {
    if (!ordersResponse) return []
    return partition(
      ordersResponse
        .filter(({ order }) => {
          // Parse appData json to extract the order class
          const appDataOrderClass = JSON.parse(order.fullAppData ?? '{}').metadata?.orderClass
            ?.orderClass as OrderClass
          // Prefer appData as the source of truth for order class, falling back to `order.class`.
          // Required because they often differ, and appData has the most correct information.
          const orderClass = appDataOrderClass ?? order.class
          return orderClass === OrderClass.LIMIT && order.signingScheme === SigningScheme.EIP712
        })
        .map(({ accountId, order }) => {
          const { chainId } = fromAccountId(accountId)
          const sellAssetId = cowSwapTokenToAssetId(chainId, order.sellToken)
          const buyAssetId = cowSwapTokenToAssetId(chainId, order.buyToken)
          return { accountId, sellAssetId, buyAssetId, order }
        }),
      ({ order }) => [OrderStatus.OPEN, OrderStatus.PRESIGNATURE_PENDING].includes(order.status),
    )
  }, [ordersResponse])

  const handleCancelOrderClick = useCallback(
    (uid: string) => {
      const order = openLimitOrders?.find(order => order.order.uid === uid)
      setOrderToCancel(order)
    },
    [openLimitOrders],
  )

  const handleResetOrderToCancel = useCallback(() => {
    setOrderToCancel(undefined)
  }, [])

  return (
    <Card {...cardProps}>
      {onBack && (
        <CardHeader px={4} display='flex' flexDirection='column' pb={0} width='100%'>
          <Flex width='100%' alignItems='center'>
            <Flex flex='1' justifyContent='flex-start'>
              <WithBackButton onBack={onBack} />
            </Flex>
            <Heading flex='2' textAlign='center' fontSize='md'>
              <Text translation='limitOrder.orders' />
            </Heading>
            <Flex flex='1' />
          </Flex>
        </CardHeader>
      )}

      <Tabs variant='unstyled' display='flex' flexDirection='column' overflowY='auto' mt={4}>
        <TabList gap={4} flex='0 0 auto' mb={2} ml={4}>
          <Tab
            p={0}
            fontSize='md'
            fontWeight='bold'
            color='text.subtle'
            _selected={textSelectedProps}
          >
            <Text translation='limitOrder.openOrders' />
          </Tab>
          <Tab
            p={0}
            fontSize='md'
            fontWeight='bold'
            color='text.subtle'
            _selected={textSelectedProps}
          >
            <Text translation='limitOrder.orderHistory' />
          </Tab>
        </TabList>
        <CardBody flex='1' overflowY='auto' minH={0} px={2} py={0}>
          <TabPanels>
            <TabPanel px={0} py={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {isLoading && (
                  // subtract height of tab header
                  <Center width='full' height={`calc(${cardProps?.height}px - 40px)`}>
                    <VStack>
                      <Spinner />

                      <Text color='text.subtle' translation='limitOrder.loadingOrderList' />
                    </VStack>
                  </Center>
                )}
                {openLimitOrders !== undefined &&
                  openLimitOrders.length > 0 &&
                  openLimitOrders.map(({ sellAssetId, buyAssetId, order }) => (
                    <LimitOrderCard
                      key={order.uid}
                      uid={order.uid}
                      sellAmountCryptoBaseUnit={order.sellAmount}
                      buyAmountCryptoBaseUnit={order.buyAmount}
                      buyAssetId={buyAssetId}
                      sellAssetId={sellAssetId}
                      validTo={order.validTo}
                      filledDecimalPercentage={bnOrZero(order.executedSellAmount)
                        .div(order.sellAmount)
                        .toNumber()}
                      status={order.status}
                      onCancelClick={handleCancelOrderClick}
                    />
                  ))}
                {!isLoading && (openLimitOrders === undefined || openLimitOrders.length === 0) && (
                  <Center h='full'>
                    <Text color='text.subtle' translation='limitOrder.noOpenOrders' />
                  </Center>
                )}
              </CardBody>
            </TabPanel>

            <TabPanel px={0} py={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {historicalLimitOrders !== undefined && historicalLimitOrders.length > 0 ? (
                  historicalLimitOrders.map(({ sellAssetId, buyAssetId, order }) => (
                    <LimitOrderCard
                      key={order.uid}
                      uid={order.uid}
                      sellAmountCryptoBaseUnit={order.sellAmount}
                      buyAmountCryptoBaseUnit={order.buyAmount}
                      buyAssetId={buyAssetId}
                      sellAssetId={sellAssetId}
                      validTo={order.validTo}
                      filledDecimalPercentage={bnOrZero(order.executedSellAmount)
                        .div(order.sellAmount)
                        .toNumber()}
                      status={order.status}
                    />
                  ))
                ) : (
                  <Center h='full'>
                    <Text color='text.subtle' translation='limitOrder.noHistoricalOrders' />
                  </Center>
                )}
              </CardBody>
            </TabPanel>
          </TabPanels>
        </CardBody>
      </Tabs>
      <CancelLimitOrder
        orderToCancel={orderToCancel}
        resetOrderToCancel={handleResetOrderToCancel}
      />
    </Card>
  )
}
