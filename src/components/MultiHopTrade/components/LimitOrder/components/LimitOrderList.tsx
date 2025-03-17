import type { CardProps, TableColumnHeaderProps } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardHeader,
  Center,
  Flex,
  Heading,
  Spinner,
  Tab,
  Table,
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { cowSwapTokenToAssetId } from '@shapeshiftoss/swapper'
import { OrderClass, OrderStatus, SigningScheme } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { partition } from 'lodash'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { WithBackButton } from '../../WithBackButton'
import { useGetLimitOrdersQuery } from '../hooks/useGetLimitOrdersQuery'
import type { OrderToCancel } from '../types'
import { CancelLimitOrder } from './CancelLimitOrder'
import { LimitOrderCard } from './LimitOrderCard'

import { Text } from '@/components/Text'

const textSelectedProps = {
  color: 'text.base',
}

const tableStyles = {
  'tr:not(:last-of-type)': {
    borderBottom: '1px solid',
    borderColor: 'gray.700',
  },
  'thead tr': {
    borderBottom: '1px solid',
    borderColor: 'gray.700',
  },
  th: {
    py: 4,
    textTransform: 'none',
    fontWeight: 'normal',
  },
}

const tableContainerHeight = {
  base: 'calc(100% - 48px)',
  md: '100%',
}

type LimitOrderListProps = {
  isLoading: boolean
  cardProps?: CardProps
  onBack?: () => void
}

export const LimitOrderList: FC<LimitOrderListProps> = ({ cardProps, onBack }) => {
  const [orderToCancel, setOrderToCancel] = useState<OrderToCancel>()
  const { data: ordersResponse, isLoading } = useGetLimitOrdersQuery()
  const headBackground = useColorModeValue('gray.50', '#181c1e')

  const thSx: TableColumnHeaderProps = useMemo(
    () => ({
      position: 'sticky',
      top: 0,
      zIndex: 'docked',
      color: 'text.subtle',
      background: headBackground,
    }),
    [headBackground],
  )

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

      <Tabs
        variant='unstyled'
        display='flex'
        flexDirection='column'
        height='100%'
        mt={4}
        pe={1}
        pb={8}
      >
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
        <CardBody flex='1' minH={0} px={2} py={0} pe={1}>
          <TabPanels height='100%'>
            <TabPanel px={0} py={0} height='100%'>
              {isLoading && (
                <Center width='full' height={`calc(${cardProps?.height}px - 40px)`}>
                  <VStack>
                    <Spinner />
                    <Text color='text.subtle' translation='limitOrder.loadingOrderList' />
                  </VStack>
                </Center>
              )}
              {openLimitOrders !== undefined && openLimitOrders.length > 0 && (
                <TableContainer
                  height={tableContainerHeight}
                  overflowY='auto'
                  className='scroll-container'
                >
                  <Table variant='unstyled' size='sm' sx={tableStyles}>
                    <Thead>
                      <Tr>
                        <Th {...thSx}>
                          <Text translation='limitOrder.sellBuy' />
                        </Th>
                        <Th {...thSx}>
                          <Text translation='limitOrder.limitExecution' />
                        </Th>
                        <Th {...thSx}>
                          <Text translation='limitOrder.statusHead' />
                        </Th>
                        <Th {...thSx} width='48px'></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {openLimitOrders.map(({ accountId, sellAssetId, buyAssetId, order }) => (
                        <LimitOrderCard
                          key={order.uid}
                          uid={order.uid}
                          accountId={accountId}
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
                          executedBuyAmountCryptoBaseUnit={order.executedBuyAmount}
                          executedSellAmountCryptoBaseUnit={order.executedSellAmount}
                        />
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
              {!isLoading && (openLimitOrders === undefined || openLimitOrders.length === 0) && (
                <Center h='full'>
                  <Text color='text.subtle' translation='limitOrder.noOpenOrders' />
                </Center>
              )}
            </TabPanel>

            <TabPanel px={0} py={0} height='100%'>
              {historicalLimitOrders !== undefined && historicalLimitOrders.length > 0 ? (
                <TableContainer
                  height={tableContainerHeight}
                  overflowY='auto'
                  className='scroll-container'
                >
                  <Table variant='unstyled' size='sm' sx={tableStyles}>
                    <Thead>
                      <Tr>
                        <Th {...thSx}>
                          <Text translation='limitOrder.sellBuy' />
                        </Th>
                        <Th {...thSx}>
                          <Text translation='limitOrder.limitExecution' />
                        </Th>
                        <Th {...thSx}>
                          <Text translation='limitOrder.statusHead' />
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {historicalLimitOrders.map(
                        ({ accountId, sellAssetId, buyAssetId, order }) => (
                          <LimitOrderCard
                            key={order.uid}
                            uid={order.uid}
                            accountId={accountId}
                            sellAmountCryptoBaseUnit={order.sellAmount}
                            buyAmountCryptoBaseUnit={order.buyAmount}
                            buyAssetId={buyAssetId}
                            sellAssetId={sellAssetId}
                            validTo={order.validTo}
                            filledDecimalPercentage={bnOrZero(order.executedSellAmount)
                              .div(order.sellAmount)
                              .toNumber()}
                            status={order.status}
                            executedBuyAmountCryptoBaseUnit={order.executedBuyAmount}
                            executedSellAmountCryptoBaseUnit={order.executedSellAmount}
                          />
                        ),
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Center h='full'>
                  <Text color='text.subtle' translation='limitOrder.noHistoricalOrders' />
                </Center>
              )}
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
