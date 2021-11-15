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
import { chainAdapters, NetworkTypes } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { fetchAsset } from 'state/slices/assetsSlice/assetsSlice'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export const TransactionRow = ({ tx, compact }: { tx: Tx; compact?: boolean }) => {
  const ref = useRef<HTMLHeadingElement>(null)
  const dispatch = useDispatch()
  const asset = useSelector((state: ReduxState) => state.assets[tx.chain])
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  const sentTx = tx.type === chainAdapters.TxType.Send
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
      width='full'
      pl={3}
      pr={4}
      rounded='lg'
      _hover={{ bg: useColorModeValue('gray.50', 'whiteAlpha.100') }}
    >
      <Flex
        alignItems='center'
        flex={1}
        justifyContent='space-between'
        as='button'
        w='full'
        py={4}
        onClick={toggleOpen}
      >
        <Flex alignItems='center'>
          <Center
            w='10'
            h='10'
            bg={useColorModeValue('gray.100', 'gray.700')}
            rounded='full'
            mr='3'
          >
            {sentTx ? <ArrowUpIcon /> : <ArrowDownIcon />}
          </Center>
          {!compact && <Text translation={`transactionRow.${tx.type}`} />}
          <Amount.Crypto
            ml={1}
            value={fromBaseUnit(tx.value, asset?.precision)}
            symbol={symbol}
            maximumFractionDigits={6}
            fontWeight='bold'
          />
        </Flex>
        <RawText color='gray.500'>{dayjs(tx.blockTime * 1000).fromNow()}</RawText>
      </Flex>
      <Collapse in={isOpen} unmountOnExit>
        <SimpleGrid gridTemplateColumns='repeat(auto-fit, minmax(180px, 1fr))' spacing='4' py={6}>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.date' />
            </Row.Label>
            <Row.Value>{dayjs(Number(tx.blockTime) * 1000).format('LLL')}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.txid' />
            </Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500' href={`${asset?.explorerTxLink}${tx.txid}`}>
                <MiddleEllipsis maxWidth='180px'>{tx.txid}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.fee' />
            </Row.Label>
            <Row.Value>
              {tx?.fee && (
                <Amount.Crypto
                  value={fromBaseUnit(tx?.fee?.value ?? '0', asset?.precision)}
                  symbol={tx?.fee?.symbol}
                  maximumFractionDigits={6}
                />
              )}
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.status' />
            </Row.Label>
            <Row.Value textAlign='left'>
              {tx.status === chainAdapters.TxStatus.Confirmed && (
                <Tag colorScheme='green' size='lg'>
                  <CheckCircleIcon mr={2} />
                  <Text translation='transactionRow.confirmed' />
                </Tag>
              )}
              {tx.status === chainAdapters.TxStatus.Pending && (
                <Tag colorScheme='blue' size='lg'>
                  <CircularProgress mr={2} size='5' />
                  <Text translation='transactionRow.pending' />
                </Tag>
              )}
              {tx.status === chainAdapters.TxStatus.Failed && (
                <Tag colorScheme='red' size='lg'>
                  <WarningTwoIcon mr={2} />
                  <Text translation='transactionRow.failed' />
                </Tag>
              )}
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation={sentTx ? 'transactionRow.to' : 'transactionRow.from'} />
            </Row.Label>
            <Row.Value>
              <Link
                isExternal
                color='blue.500'
                href={`${asset?.explorerTxLink}${tx.to ?? tx.from}`}
              >
                <MiddleEllipsis maxWidth='180px'>{tx.to ?? tx.from}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>
        </SimpleGrid>
      </Collapse>
    </Box>
  )
}
