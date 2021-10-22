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
import { NetworkTypes } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getDate, TxStatusEnum } from 'hooks/useTransactions/useTransactions'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { fetchAsset } from 'state/slices/assetsSlice/assetsSlice'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export const TransactionRow = ({ tx }: { tx: Tx }) => {
  const ref = useRef<HTMLHeadingElement>(null)
  const dispatch = useDispatch()
  const asset = useSelector((state: ReduxState) => state.assets[tx.chain])
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  const sentTx = tx.type === 'send'
  const symbol = tx?.chainSpecific?.token?.symbol ?? asset?.symbol

  useEffect(() => {
    if (!symbol) {
      dispatch(
        fetchAsset({
          chain: tx.chain,
          network: NetworkTypes.MAINNET
        })
      )
    }
  }, [dispatch, symbol, tx.chain])

  return (
    <Box
      ref={ref}
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
            {sentTx ? <ArrowUpIcon /> : <ArrowDownIcon />}
          </Center>
          {ref?.current?.offsetWidth >= 350 && (
            <Text translation={sentTx ? 'transactionRow.sent' : 'transactionRow.received'} />
          )}
          <Amount.Crypto
            ml={2}
            value={fromBaseUnit(tx.value, 18)}
            symbol={symbol}
            maximumFractionDigits={4}
          />
        </Flex>
        <RawText>{dayjs(tx.blockTime * 1000).fromNow()}</RawText>
      </Flex>
      <Collapse in={isOpen} unmountOnExit>
        <SimpleGrid gridTemplateColumns='repeat(auto-fit, minmax(180px, 1fr))' spacing='4' py={6}>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.date' />
            </Row.Label>
            <Row.Value>{getDate(tx.blockTime)}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.txid' />
            </Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500'>
                <MiddleEllipsis maxWidth='180px'>{tx.txid}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.fee' />
            </Row.Label>
            <Row.Value>
              <Amount.Crypto
                ml={2}
                value={fromBaseUnit(tx.fee, 18)}
                symbol={tx.chain}
                maximumFractionDigits={4}
              />
            </Row.Value>
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
              <Text translation={sentTx ? 'transactionRow.to' : 'transactionRow.from'} />
            </Row.Label>
            <Row.Value>
              <MiddleEllipsis maxWidth='180px'>{tx.to ?? tx.from}</MiddleEllipsis>
            </Row.Value>
          </Row>
        </SimpleGrid>
      </Collapse>
    </Box>
  )
}
