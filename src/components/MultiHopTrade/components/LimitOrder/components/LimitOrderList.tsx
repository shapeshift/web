import type { CardProps } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardHeader,
  Center,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAccountId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS } from '@shapeshiftoss/swapper/dist/swappers/CowSwapper/utils/constants'
import { OrderClass, OrderStatus } from '@shapeshiftoss/types/dist/cowSwap'
import { bnOrZero } from '@shapeshiftoss/utils'
import { partition } from 'lodash'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { Text } from 'components/Text'
import { chainIdFeeAssetReferenceMap } from 'state/slices/assetsSlice/utils'

import { WithBackButton } from '../../WithBackButton'
import { useGetLimitOrdersQuery } from '../hooks/useGetLimitOrdersForAccountQuery'
import { LimitOrderCard } from './LimitOrderCard'

type LimitOrderListProps = {
  isLoading: boolean
  cardProps?: CardProps
  onBack?: () => void
}

const cowSwapTokenToAssetId = (chainId: ChainId, cowSwapToken: Address) => {
  const { chainNamespace, chainReference } = fromChainId(chainId)
  return cowSwapToken.toLowerCase() === COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS.toLowerCase()
    ? toAssetId({
        chainId,
        assetNamespace: 'slip44',
        assetReference: chainIdFeeAssetReferenceMap(chainNamespace, chainReference),
      })
    : toAssetId({
        chainId,
        assetNamespace: ASSET_NAMESPACE.erc20,
        assetReference: cowSwapToken,
      })
}

export const LimitOrderList: FC<LimitOrderListProps> = ({ cardProps, onBack }) => {
  const textColorBaseProps = useMemo(() => {
    return {
      color: 'text.base',
      ...(onBack && {
        bg: 'blue.500',
        px: 4,
        py: 2,
        borderRadius: 'full',
      }),
    }
  }, [onBack])

  const { data: ordersResponse } = useGetLimitOrdersQuery()

  const [openLimitOrders, historicalLimitOrders] = useMemo(() => {
    if (!ordersResponse) return []
    return partition(
      ordersResponse
        // TODO: also filter on `order.signingScheme === SigningScheme.EIP712`
        // Temporarily disabled to allow us to see orders while developing
        .filter(({ order }) => order.class === OrderClass.LIMIT)
        .map(({ accountId, order }) => {
          const { chainId } = fromAccountId(accountId)
          const sellAssetId = cowSwapTokenToAssetId(chainId, order.sellToken)
          const buyAssetId = cowSwapTokenToAssetId(chainId, order.buyToken)
          return { accountId, sellAssetId, buyAssetId, order }
        }),
      ({ order }) => [OrderStatus.OPEN, OrderStatus.PRESIGNATURE_PENDING].includes(order.status),
    )
  }, [ordersResponse])

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
            color={onBack ? 'text.base' : 'text.subtle'}
            _selected={textColorBaseProps}
          >
            <Text translation='limitOrder.openOrders' />
          </Tab>
          <Tab
            p={0}
            fontSize='md'
            fontWeight='bold'
            color={onBack ? 'text.base' : 'text.subtle'}
            _selected={textColorBaseProps}
          >
            <Text translation='limitOrder.orderHistory' />
          </Tab>
        </TabList>
        <CardBody flex='1' overflowY='auto' minH={0} px={2} py={0}>
          <TabPanels>
            <TabPanel px={0} py={0}>
              <CardBody px={0} overflowY='auto' flex='1 1 auto'>
                {openLimitOrders !== undefined && openLimitOrders.length > 0 ? (
                  openLimitOrders.map(({ sellAssetId, buyAssetId, order }) => (
                    <LimitOrderCard
                      key={order.uid}
                      id={order.uid}
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
                      id={order.uid}
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
    </Card>
  )
}
