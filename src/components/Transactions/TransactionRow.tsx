import { ArrowDownIcon, ArrowUpIcon, CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Collapse,
  Flex,
  Link,
  SimpleGrid,
  Tag,
  useColorModeValue
} from '@chakra-ui/react'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import {
  FormatTransactionType,
  TxStatusEnum,
  TxTypeEnum
} from 'hooks/useTransactions/useTransactions'
import { useState } from 'react'

export const TransactionRow = ({ tx }: { tx: FormatTransactionType }) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  const sentTx = tx.type === TxTypeEnum.Sent

  return (
    <Box
      as='button'
      onClick={toggleOpen}
      width='full'
      py={4}
      pl={3}
      pr={4}
      rounded='lg'
      _hover={{ bg: useColorModeValue('gray.50', 'whiteAlpha.100') }}
    >
      <Flex alignItems='center' flex={1} justifyContent='space-between'>
        <Flex alignItems='center'>
          <Center w='10' h='10' bg={'whiteAlpha.200'} rounded='full' mr='3'>
            <ArrowDownIcon /> {/* receive */}
            <ArrowUpIcon /> {/* send */}
          </Center>
          <Text translation={sentTx ? 'transactionRow.sent' : 'transactionRow.received'} />
          <RawText ml={2}>{`${tx.amount} ${tx.symbol}`}</RawText>
        </Flex>
        <RawText>{tx.dateFromNow}</RawText>
      </Flex>
      <Collapse in={isOpen}>
        <SimpleGrid gridTemplateColumns='repeat(auto-fit, minmax(180px, 1fr))' spacing='4' py={6}>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.date' />
            </Row.Label>
            <Row.Value>{tx.date}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.txid' />
            </Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500'>
                {/* TODO: add ellipsis */}
                {`${tx.txid?.substr(0, 7)}...`}
              </Link>
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.fee' />
            </Row.Label>
            {/* TODO: make fee coin symbol denomination dynamic */}
            <Row.Value>{`${tx.fee} ETH`}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.status' />
            </Row.Label>
            <Row.Value textAlign='left'>
              {tx.status === TxStatusEnum.Confirmed && (
                <Tag colorScheme='green' size='lg'>
                  <CheckCircleIcon mr={2} />
                  <Text translation='transactionRow.confirmed' />
                </Tag>
              )}
              {tx.status === TxStatusEnum.Failed && (
                <Tag colorScheme='red' size='lg'>
                  <WarningTwoIcon mr={2} />
                  <Text translation='transactionRow.failed' />
                </Tag>
              )}
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.network' />
            </Row.Label>
            <Row.Value>{tx.network}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.blockHeight' />
            </Row.Label>
            <Row.Value>{tx.blockHeight}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              {sentTx ? (
                <Text translation='transactionRow.to' />
              ) : (
                <Text translation='transactionRow.from' />
              )}
            </Row.Label>
            {/* TODO: add ellipsis */}
            <Row.Value>
              {sentTx ? `${tx.to?.substr(0, 7)}...` : `${tx.from?.substr(0, 7)}...`}
            </Row.Value>
          </Row>
        </SimpleGrid>
      </Collapse>
    </Box>
  )
}
