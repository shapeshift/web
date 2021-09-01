import { ArrowDownIcon, ArrowUpIcon, CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  CircularProgress,
  Collapse,
  Flex,
  Link,
  SimpleGrid,
  Tag,
  useColorModeValue
} from '@chakra-ui/react'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { FormatTransactionType, TransactionStatusEnum } from 'hooks/useTransactions/useTransactions'
import { useState } from 'react'

export const TransactionRow = ({ tx }: { tx: FormatTransactionType }) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
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
          <Text
            translation={
              tx.type === TransactionStatusEnum.Sent
                ? 'transactionRow.sent'
                : 'transactionRow.received'
            }
          />
          <RawText ml={2}>{`${tx.amount} ${tx.symbol}`}</RawText>
        </Flex>
        <RawText>{`${tx.date}`}</RawText>
      </Flex>
      <Collapse in={isOpen}>
        <SimpleGrid gridTemplateColumns='repeat(auto-fit, minmax(180px, 1fr))' spacing='4' py={6}>
          <Row variant='vertical'>
            <Row.Label>Date</Row.Label>
            <Row.Value>08/20/21 @ 10:44 AM</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>Transaction ID</Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500'>
                0x3....
              </Link>
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>Fee</Row.Label>
            <Row.Value>0.002625 ETH</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>Status</Row.Label>
            <Row.Value textAlign='left'>
              <Tag colorScheme='green' size='lg'>
                <CheckCircleIcon mr={2} />
                Confirmed
              </Tag>
              <Tag colorScheme='yellow' size='lg'>
                <CircularProgress
                  color='yellow.500'
                  trackColor='transparent'
                  isIndeterminate
                  size={4}
                  mr={2}
                />
                Pending
              </Tag>
              <Tag colorScheme='red' size='lg'>
                <WarningTwoIcon mr={2} />
                Failed
              </Tag>
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>Network</Row.Label>
            <Row.Value>Ethereum</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>Block Height</Row.Label>
            <Row.Value>00000</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>To</Row.Label>
            <Row.Value>0x....</Row.Value>
          </Row>
        </SimpleGrid>
      </Collapse>
    </Box>
  )
}
