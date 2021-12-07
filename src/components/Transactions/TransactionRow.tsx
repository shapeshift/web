import { ArrowDownIcon, ArrowUpIcon, CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Collapse, Flex, Link, SimpleGrid, Tag, useColorModeValue } from '@chakra-ui/react'
import { Asset, chainAdapters } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRef, useState } from 'react'
import { FaExchangeAlt } from 'react-icons/fa'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { selectTxById } from 'state/slices/txHistorySlice/txHistorySlice'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export const TransactionRow = ({ txId, activeAsset }: { txId: string; activeAsset?: Asset }) => {
  const ref = useRef<HTMLHeadingElement>(null)
  //const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)

  // stables need precision of eth (18) rather than 10
  const tx = useSelector((state: ReduxState) => selectTxById(state, txId))

  const standardTx = tx.transfers.length === 1 ? tx.transfers[0] : undefined
  const buyTx = !!tx.tradeDetails
    ? tx.transfers.find(t => t.type === chainAdapters.TxType.Receive)
    : undefined
  const sellTx = !!tx.tradeDetails
    ? tx.transfers.find(t => t.type === chainAdapters.TxType.Send)
    : undefined
  const tradeTx = activeAsset?.caip19 === sellTx?.caip19 ? sellTx : buyTx

  const standardAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, standardTx?.caip19 ?? '')
  )
  const feeAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, tx.fee?.caip19 ?? '')
  )
  const buyAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, buyTx?.caip19 ?? '')
  )
  const sellAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, sellTx?.caip19 ?? '')
  )
  const tradeAsset = activeAsset?.symbol === sellAsset?.symbol ? sellAsset : buyAsset

  const value = standardTx?.value ?? tradeTx?.value ?? '0'
  const to = standardTx?.to ?? tradeTx?.to ?? ''
  const from = standardTx?.from ?? tradeTx?.from ?? ''
  const type = standardTx?.type ?? tx.tradeDetails?.type ?? ''
  const symbol = standardAsset?.symbol ?? tradeAsset?.symbol ?? ''
  const precision = standardAsset?.precision ?? tradeAsset?.precision ?? 18
  const explorerTxLink = standardAsset?.explorerTxLink ?? tradeAsset?.explorerTxLink ?? ''
  const explorerAddressLink =
    standardAsset?.explorerAddressLink ?? tradeAsset?.explorerAddressLink ?? ''

  // log what transactions we are currently not parsing so we can update accordingly
  if (!type) {
    console.log('unsupported transaction:', tx)
    return null
  }

  // TODO: new tx message payloads changed how this will need to happen (fixme)
  //useEffect(() => {
  //  dispatch(fetchAsset(assetCAIP19))
  //}, [dispatch, tx])

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
        textAlign='left'
        as='button'
        w='full'
        py={4}
        onClick={toggleOpen}
      >
        <Flex alignItems='center' width='full'>
          <IconCircle mr={3}>
            {type === chainAdapters.TxType.Send && <ArrowUpIcon />}
            {type === chainAdapters.TxType.Receive && <ArrowDownIcon color='green.500' />}
            {type === chainAdapters.TradeType.Trade && <FaExchangeAlt />}
          </IconCircle>

          <Flex justifyContent='flex-start' flex={1} alignItems='center'>
            <Box flex={1}>
              <Text
                fontWeight='bold'
                overflow='hidden'
                flex={1}
                textOverflow='ellipsis'
                maxWidth='60%'
                lineHeight='1'
                whiteSpace='nowrap'
                mb={2}
                translation={[`transactionRow.${type.toLowerCase()}`, { symbol: '' }]}
              />
              <RawText color='gray.500' fontSize='sm' lineHeight='1'>
                {dayjs(tx.blockTime * 1000).fromNow()}
              </RawText>
            </Box>

            <Flex flexDir='column' ml='auto' textAlign='right'>
              <Amount.Crypto
                color={type === chainAdapters.TxType.Receive ? 'green.500' : 'inherit'}
                value={fromBaseUnit(value, precision)}
                symbol={symbol}
                maximumFractionDigits={6}
                prefix={type === chainAdapters.TxType.Send ? '-' : ''}
              />
            </Flex>
          </Flex>
        </Flex>
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
              <Link isExternal color='blue.500' href={`${explorerTxLink}${tx.txid}`}>
                <MiddleEllipsis maxWidth='180px'>{tx.txid}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>

          <Row variant='vertical' hidden={!tradeTx}>
            <Row.Label>
              <Text translation={'transactionRow.amount'} />
            </Row.Label>
            <Row.Value>
              <Amount.Crypto
                value={fromBaseUnit(sellTx?.value ?? '0', sellAsset?.precision ?? 18)}
                symbol={sellAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
              <Text translation='transactionRow.for' />
              <Amount.Crypto
                value={fromBaseUnit(buyTx?.value ?? '0', buyAsset?.precision ?? 18)}
                symbol={buyAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
            </Row.Value>
          </Row>

          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.fee' />
            </Row.Label>
            <Row.Value>
              {tx?.fee && feeAsset && (
                <Amount.Crypto
                  value={fromBaseUnit(tx?.fee?.value ?? '0', feeAsset?.precision ?? 18)}
                  symbol={feeAsset.symbol}
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
              {type === chainAdapters.TxType.Send && <Text translation={'transactionRow.to'} />}
              {type === chainAdapters.TxType.Receive && (
                <Text translation={'transactionRow.from'} />
              )}
            </Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500' href={`${explorerAddressLink}${to ?? from}`}>
                <MiddleEllipsis maxWidth='180px'>{to ?? from}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>
        </SimpleGrid>
      </Collapse>
    </Box>
  )
}
