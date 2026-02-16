import { Badge, Box, Flex, Icon, Link, Text, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import {
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaListUl,
  FaTimesCircle,
} from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { DisplayToolCard } from './DisplayToolCard'

type OrderStatus = 'open' | 'fulfilled' | 'cancelled' | 'expired' | 'presignaturePending'

const STATUS_CONFIG: Record<OrderStatus, { icon: IconType; color: string }> = {
  open: { icon: FaClock, color: 'blue.500' },
  fulfilled: { icon: FaCheckCircle, color: 'green.500' },
  cancelled: { icon: FaTimesCircle, color: 'red.500' },
  expired: { icon: FaExclamationCircle, color: 'gray.500' },
  presignaturePending: { icon: FaClock, color: 'yellow.500' },
}

export const GetLimitOrdersUI = ({ toolPart }: ToolUIProps<'getLimitOrdersTool'>) => {
  const translate = useTranslate()
  const { state, output: toolOutput } = toolPart

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  const orders = useMemo(() => toolOutput?.orders ?? [], [toolOutput?.orders])
  const openOrdersCount = useMemo(() => orders.filter(o => o.status === 'open').length, [orders])

  if (state === 'output-error' || !toolOutput) {
    return null
  }

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Flex alignItems='center' gap={2}>
            <Icon as={FaListUl} boxSize={5} color='purple.500' />
            <Text fontSize='lg' fontWeight='semibold'>
              {translate('agenticChat.agenticChatTools.getLimitOrders.title')}
            </Text>
          </Flex>
          {openOrdersCount > 0 && (
            <Badge colorScheme='blue' fontSize='xs'>
              {translate('agenticChat.agenticChatTools.getLimitOrders.openOrders', {
                count: openOrdersCount,
              })}
            </Badge>
          )}
        </DisplayToolCard.HeaderRow>
      </DisplayToolCard.Header>
      <DisplayToolCard.Content>
        {orders.length === 0 ? (
          <Text fontSize='sm' color={mutedColor} textAlign='center' py={4}>
            {translate('agenticChat.agenticChatTools.getLimitOrders.noOrders')}
          </Text>
        ) : (
          <Flex direction='column'>
            {orders.map((order, index) => (
              <Box
                key={order.orderId}
                py={3}
                borderTopWidth={index > 0 ? 1 : 0}
                borderColor={borderColor}
              >
                <Flex direction='column' gap={2}>
                  <Flex alignItems='center' justifyContent='space-between'>
                    <Flex alignItems='center' gap={2}>
                      <Text fontSize='sm' fontWeight='medium'>
                        {order.sellTokenSymbol} → {order.buyTokenSymbol}
                      </Text>
                      <Flex
                        alignItems='center'
                        gap={1}
                        fontSize='xs'
                        fontWeight='medium'
                        color={STATUS_CONFIG[order.status as OrderStatus]?.color ?? 'gray.500'}
                      >
                        <Icon
                          as={STATUS_CONFIG[order.status as OrderStatus]?.icon ?? FaClock}
                          boxSize={3}
                        />
                        <Text>
                          {translate(
                            `agenticChat.agenticChatTools.getLimitOrders.status.${order.status}` as const,
                          )}
                        </Text>
                      </Flex>
                    </Flex>
                    <Link href={order.trackingUrl} isExternal fontSize='xs' color='blue.500'>
                      <Flex alignItems='center' gap={1}>
                        <Text>{translate('agenticChat.agenticChatTools.getLimitOrders.view')}</Text>
                        <Icon as={FaExternalLinkAlt} boxSize={3} />
                      </Flex>
                    </Link>
                  </Flex>
                  <Flex direction='column' gap={1} fontSize='xs' color={mutedColor}>
                    <Flex justifyContent='space-between'>
                      <Text>
                        {translate('agenticChat.agenticChatTools.getLimitOrders.sellLabel')}:
                      </Text>
                      <Text fontFamily='mono'>
                        {order.sellAmount} {order.sellTokenSymbol}
                      </Text>
                    </Flex>
                    <Flex justifyContent='space-between'>
                      <Text>
                        {translate('agenticChat.agenticChatTools.getLimitOrders.buyLabel')}:
                      </Text>
                      <Text fontFamily='mono'>
                        {order.buyAmount} {order.buyTokenSymbol}
                      </Text>
                    </Flex>
                    {order.filledPercent > 0 && (
                      <Flex justifyContent='space-between'>
                        <Text>
                          {translate('agenticChat.agenticChatTools.getLimitOrders.filledLabel')}:
                        </Text>
                        <Text fontFamily='mono'>{order.filledPercent.toFixed(1)}%</Text>
                      </Flex>
                    )}
                    <Flex justifyContent='space-between'>
                      <Text>
                        {translate('agenticChat.agenticChatTools.getLimitOrders.expiresLabel')}:
                      </Text>
                      <Text>{order.expiresAt}</Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        )}
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}
