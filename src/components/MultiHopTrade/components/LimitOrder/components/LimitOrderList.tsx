import { WarningTwoIcon } from '@chakra-ui/icons'
import type { CardProps, TableColumnHeaderProps } from '@chakra-ui/react'
import {
  Box,
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
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FC } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { WithBackButton } from '../../WithBackButton'
import { useLimitOrdersQuery } from '../hooks/useLimitOrders'
import type { OrderToCancel } from '../types'
import { CancelLimitOrder } from './CancelLimitOrder'
import { LimitOrderCard } from './LimitOrderCard'

import { cardstyles } from '@/components/MultiHopTrade/const'
import { Text } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'

const textSelectedProps = {
  color: 'text.base',
}

const tabsMinHeight = {
  base: 'calc(100vh - var(--mobile-nav-offset) - env(safe-area-inset-top) - var(--safe-area-inset-top))',
  md: 'auto',
}

const cardMinHeight = {
  base: 'calc(100vh - var(--mobile-nav-offset) - env(safe-area-inset-top) - var(--safe-area-inset-top))',
  md: 'auto',
}

const tableStyles = {
  tableLayout: 'fixed',
  borderCollapse: 'separate',
  borderSpacing: 0,
  'tbody tr:not(:last-of-type) td': {
    borderBottom: '1px solid',
    borderColor: 'gray.700',
  },
  th: {
    borderBottom: '1px solid',
    borderColor: 'gray.700',
    py: 4,
    textTransform: 'none',
    fontWeight: 'normal',
  },
}

const tableContainerHeight = {
  base: 'calc(100% - 48px)',
  md: '100%',
}

const tableContainerStyle = {
  minHeight: '300px',
}

const headBackgroundLight = 'background.surface.base'
const headBackgroundDark = { base: 'background.surface.base', md: 'darkNeutral.900' }

const OrdersTableHead: FC = () => {
  const headBackground = useColorModeValue(headBackgroundLight, headBackgroundDark)

  const thSx: TableColumnHeaderProps = useMemo(
    () => ({
      position: 'sticky',
      // -1px so rows can't show through a sub-pixel gap above the header at fractional DPRs
      top: '-1px',
      zIndex: 'docked',
      color: 'text.subtle',
      background: headBackground,
    }),
    [headBackground],
  )

  return (
    <>
      <colgroup>
        <col width='42%' />
        <col width='28%' />
        <col width='30%' />
      </colgroup>
      <Thead>
        <Tr>
          <Th {...thSx}>
            <Text translation='limitOrder.orderHead' />
          </Th>
          <Th {...thSx}>
            <Text translation='limitOrder.priceHead' />
          </Th>
          <Th {...thSx}>
            <Text translation='limitOrder.statusHead' />
          </Th>
        </Tr>
      </Thead>
    </>
  )
}

const LoadingOrders: FC = () => (
  <Center h='full' py={12}>
    <VStack spacing={4}>
      <Spinner />
      <Text color='text.subtle' translation='limitOrder.loadingOrderList' />
    </VStack>
  </Center>
)

const OrdersEmptyState: FC<{ translation: string; hasWarning?: boolean }> = ({
  translation,
  hasWarning,
}) => (
  <Center h='full' py={12}>
    <VStack spacing={4}>
      {hasWarning && <WarningTwoIcon color='text.warning' boxSize={6} />}
      <Text color='text.subtle' translation={translation} />
    </VStack>
  </Center>
)

const OrdersWarning: FC<{ translation: string }> = ({ translation }) => {
  const translate = useTranslate()

  return (
    <TooltipWithTouch label={translate(translation)}>
      <WarningTwoIcon color='text.warning' boxSize={4} />
    </TooltipWithTouch>
  )
}

type LimitOrdersPanelProps = {
  orders: OrderToCancel[]
  isLoading: boolean
  errorTranslation: string | undefined
  emptyTranslation: string
  onCancelOrderClick?: (order: OrderToCancel) => void
}

const LimitOrdersPanel: FC<LimitOrdersPanelProps> = ({
  orders,
  isLoading,
  errorTranslation,
  emptyTranslation,
  onCancelOrderClick,
}) => {
  'use no memo'
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Estimated row height
    overscan: 5,
  })

  const handleCancelOrderClick = useCallback(
    (uid: string) => {
      const order = orders.find(({ order }) => order.uid === uid)
      if (order) onCancelOrderClick?.(order)
    },
    [onCancelOrderClick, orders],
  )

  if (isLoading) return <LoadingOrders />

  if (!orders.length) {
    return (
      <OrdersEmptyState
        translation={errorTranslation ?? emptyTranslation}
        hasWarning={Boolean(errorTranslation)}
      />
    )
  }

  const virtualRows = rowVirtualizer.getVirtualItems()
  const topRowSpacerHeight = virtualRows.length > 0 ? virtualRows[0].start : 0
  const bottomRowSpacerHeight =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0

  return (
    <Box height={tableContainerHeight} style={tableContainerStyle}>
      <TableContainer height='100%' overflowY='auto' className='scroll-container' ref={parentRef}>
        <Table variant='unstyled' size='sm' sx={tableStyles}>
          <OrdersTableHead />
          <Tbody>
            {topRowSpacerHeight > 0 && <Tr height={topRowSpacerHeight} />}
            {virtualRows.map(virtualRow => {
              const { accountId, sellAssetId, buyAssetId, order } = orders[virtualRow.index]
              return (
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
                  onCancelClick={onCancelOrderClick && handleCancelOrderClick}
                  executedBuyAmountCryptoBaseUnit={order.executedBuyAmount}
                  executedSellAmountCryptoBaseUnit={order.executedSellAmount}
                />
              )
            })}
            {bottomRowSpacerHeight > 0 && <Tr height={bottomRowSpacerHeight} />}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}

type LimitOrderListProps = {
  cardProps?: CardProps
  onBack?: () => void
}

const OPEN_STATUSES = [OrderStatus.OPEN, OrderStatus.PRESIGNATURE_PENDING]

export const LimitOrderList: FC<LimitOrderListProps> = ({ cardProps, onBack }) => {
  const [orderToCancel, setOrderToCancel] = useState<OrderToCancel>()
  const {
    currentData: ordersResponse,
    isLoading: isQueryLoading,
    error,
    failedAccountIds,
  } = useLimitOrdersQuery()
  const { isLoading: isDiscoveringAccounts } = useDiscoverAccounts()

  const { openOrders, historicalOrders } = useMemo(() => {
    const rows = (ordersResponse ?? [])
      .filter(
        ({ order }) =>
          order.class === OrderClass.LIMIT && order.signingScheme === SigningScheme.EIP712,
      )
      .map(({ accountId, order }) => {
        const { chainId } = fromAccountId(accountId)
        const sellAssetId = cowSwapTokenToAssetId(chainId, order.sellToken)
        const buyAssetId = cowSwapTokenToAssetId(chainId, order.buyToken)
        return { accountId, sellAssetId, buyAssetId, order }
      })

    return {
      openOrders: rows.filter(({ order }) => OPEN_STATUSES.includes(order.status)),
      historicalOrders: rows.filter(({ order }) => !OPEN_STATUSES.includes(order.status)),
    }
  }, [ordersResponse])

  const isLoading = isQueryLoading || (isDiscoveringAccounts && !ordersResponse?.length)
  const hasFailedAccounts = failedAccountIds.length > 0
  const errorTranslation = (() => {
    if (error) return 'limitOrder.failedToFetchOrders'
    if (hasFailedAccounts) return 'limitOrder.failedToFetchSomeOrders'
  })()

  const warningTranslation = (() => {
    if (isLoading) return
    if (error && ordersResponse) return 'limitOrder.failedToRefreshOrders'
    if (hasFailedAccounts) return 'limitOrder.failedToFetchSomeOrders'
  })()

  const handleCancelOrderClick = useCallback((order: OrderToCancel) => {
    setOrderToCancel(order)
  }, [])

  return (
    <Card {...cardstyles} minHeight={cardMinHeight} {...cardProps}>
      {onBack && (
        <CardHeader
          px={4}
          display='flex'
          flexDirection='column'
          pb={0}
          width='100%'
          position='sticky'
        >
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
        minH={tabsMinHeight}
        isLazy
      >
        <Flex flex='0 0 auto' alignItems='center' justifyContent='space-between' mb={2} mx={4}>
          <TabList gap={4}>
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
          {warningTranslation && <OrdersWarning translation={warningTranslation} />}
        </Flex>
        <CardBody flex='1' minH={0} px={2} py={0} pe={1}>
          <TabPanels height='100%'>
            <TabPanel px={0} py={0} height='100%'>
              <LimitOrdersPanel
                orders={openOrders}
                isLoading={isLoading}
                errorTranslation={errorTranslation}
                emptyTranslation='limitOrder.noOpenOrders'
                onCancelOrderClick={handleCancelOrderClick}
              />
            </TabPanel>

            <TabPanel px={0} py={0} height='100%'>
              <LimitOrdersPanel
                orders={historicalOrders}
                isLoading={isLoading}
                errorTranslation={errorTranslation}
                emptyTranslation='limitOrder.noHistoricalOrders'
              />
            </TabPanel>
          </TabPanels>
        </CardBody>
      </Tabs>
      <CancelLimitOrder orderToCancel={orderToCancel} onSetOrderToCancel={setOrderToCancel} />
    </Card>
  )
}
