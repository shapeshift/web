import { Badge, Box, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import { TradeType, TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { FaHistory } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { DisplayToolCard } from './DisplayToolCard'

import { TransactionTypeIcon } from '@/components/TransactionHistory/TransactionTypeIcon'
import { middleEllipsis } from '@/lib/utils'

const mapTxType = (type: string): string => {
  switch (type) {
    case 'send':
      return TransferType.Send
    case 'receive':
      return TransferType.Receive
    case 'swap':
      return TradeType.Swap
    case 'contract':
      return TransferType.Contract
    default:
      return type
  }
}

const mapTxStatus = (status: string): TxStatus => {
  switch (status) {
    case 'success':
      return TxStatus.Confirmed
    case 'failed':
      return TxStatus.Failed
    case 'pending':
      return TxStatus.Pending
    default:
      return TxStatus.Unknown
  }
}

export const GetTransactionHistoryUI = ({ toolPart }: ToolUIProps<'transactionHistoryTool'>) => {
  const translate = useTranslate()
  const { state, output: toolOutput, input } = toolPart
  const toolInput = input as Partial<Record<string, unknown>> | undefined

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  const getStatusColor = useMemo(
    () => (status: string) => {
      switch (status) {
        case 'success':
          return 'green'
        case 'failed':
          return 'red'
        case 'pending':
          return 'yellow'
        default:
          return 'gray'
      }
    },
    [],
  )

  const formatTimestamp = useMemo(
    () => (timestamp: number) => {
      const date = new Date(timestamp * 1000)
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [],
  )

  if (state === 'output-error' || !toolOutput) {
    return null
  }

  const { transactions } = toolOutput

  const renderTransactions = toolInput?.renderTransactions

  if (renderTransactions === false) {
    return null
  }

  const renderCount =
    typeof renderTransactions === 'number' ? renderTransactions : transactions.length

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Flex alignItems='center' gap={2}>
            <Icon as={FaHistory} boxSize={5} color='blue.500' />
            <Text fontSize='lg' fontWeight='semibold'>
              {translate('agenticChat.agenticChatTools.getTransactionHistory.title')}
            </Text>
          </Flex>
        </DisplayToolCard.HeaderRow>
      </DisplayToolCard.Header>
      <DisplayToolCard.Content>
        {transactions.length === 0 ? (
          <Text fontSize='sm' color={mutedColor} textAlign='center' py={4}>
            {translate('agenticChat.agenticChatTools.getTransactionHistory.noTransactions')}
          </Text>
        ) : (
          <Flex direction='column'>
            {transactions.slice(0, renderCount).map((tx, index) => (
              <Box
                key={tx.txid}
                py={3}
                borderTopWidth={index > 0 ? 1 : 0}
                borderColor={borderColor}
              >
                <Flex direction='column' gap={2}>
                  <Flex alignItems='center' justifyContent='space-between'>
                    <Flex alignItems='center' gap={2}>
                      <Box boxSize={6}>
                        <TransactionTypeIcon
                          type={mapTxType(tx.type)}
                          status={mapTxStatus(tx.status)}
                        />
                      </Box>
                      <Text fontSize='sm' fontWeight='medium'>
                        {translate(
                          `agenticChat.agenticChatTools.getTransactionHistory.type.${tx.type}` as const,
                        )}
                      </Text>
                    </Flex>
                    <Text fontSize='xs' color={mutedColor}>
                      {formatTimestamp(tx.timestamp)}
                    </Text>
                  </Flex>

                  <Badge
                    colorScheme={getStatusColor(tx.status)}
                    fontSize='xs'
                    alignSelf='flex-start'
                  >
                    {translate(
                      `agenticChat.agenticChatTools.getTransactionHistory.status.${tx.status}` as const,
                    )}
                  </Badge>

                  <Flex direction='column' gap={1} fontSize='xs' color={mutedColor}>
                    <Flex justifyContent='space-between'>
                      <Text>
                        {translate('agenticChat.agenticChatTools.getTransactionHistory.txid')}:
                      </Text>
                      <Text fontFamily='mono'>{middleEllipsis(tx.txid)}</Text>
                    </Flex>
                    {tx.from && (
                      <Flex justifyContent='space-between'>
                        <Text>
                          {translate('agenticChat.agenticChatTools.getTransactionHistory.from')}:
                        </Text>
                        <Text fontFamily='mono'>{middleEllipsis(tx.from)}</Text>
                      </Flex>
                    )}
                    {tx.to && (
                      <Flex justifyContent='space-between'>
                        <Text>
                          {translate('agenticChat.agenticChatTools.getTransactionHistory.to')}:
                        </Text>
                        <Text fontFamily='mono'>{middleEllipsis(tx.to)}</Text>
                      </Flex>
                    )}
                    {tx.value && (
                      <Flex justifyContent='space-between'>
                        <Text>
                          {translate('agenticChat.agenticChatTools.getTransactionHistory.value')}:
                        </Text>
                        <Text fontFamily='mono'>{tx.value}</Text>
                      </Flex>
                    )}
                    {tx.fee && (
                      <Flex justifyContent='space-between'>
                        <Text>
                          {translate('agenticChat.agenticChatTools.getTransactionHistory.fee')}:
                        </Text>
                        <Text fontFamily='mono'>{tx.fee}</Text>
                      </Flex>
                    )}
                    {tx.network && (
                      <Flex justifyContent='space-between'>
                        <Text>
                          {translate('agenticChat.agenticChatTools.getTransactionHistory.network')}:
                        </Text>
                        <Text>{tx.network}</Text>
                      </Flex>
                    )}
                    {tx.tokenTransfers && tx.tokenTransfers.length > 0 && (
                      <Box mt={1}>
                        <Text fontWeight='medium' mb={1}>
                          {translate('agenticChat.agenticChatTools.getTransactionHistory.tokens')}:
                        </Text>
                        {tx.tokenTransfers.map((transfer, i) => (
                          <Flex key={i} justifyContent='space-between' pl={2}>
                            <Text>{transfer.symbol}:</Text>
                            <Text fontFamily='mono'>{transfer.amount}</Text>
                          </Flex>
                        ))}
                      </Box>
                    )}
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
