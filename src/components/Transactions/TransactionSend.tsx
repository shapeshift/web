import { ArrowUpIcon, CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Collapse, Flex, Link, SimpleGrid, Tag } from '@chakra-ui/react'
import { Asset, chainAdapters } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'

export const TransactionSend = ({ txDetails }: { txDetails: TxDetails; activeAsset?: Asset }) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <>
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
            <ArrowUpIcon />
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
                translation={[`transactionRow.${txDetails.type.toLowerCase()}`, { symbol: '' }]}
              />
              <RawText color='gray.500' fontSize='sm' lineHeight='1'>
                {dayjs(txDetails.tx.blockTime * 1000).fromNow()}
              </RawText>
            </Box>

            <Flex flexDir='column' ml='auto' textAlign='right'>
              <Amount.Crypto
                color='inherit'
                value={fromBaseUnit(txDetails.value, txDetails.precision)}
                symbol={txDetails.symbol}
                maximumFractionDigits={6}
                prefix='-'
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
            <Row.Value>{dayjs(Number(txDetails.tx.blockTime) * 1000).format('LLL')}</Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.txid' />
            </Row.Label>
            <Row.Value>
              <Link
                isExternal
                color='blue.500'
                href={`${txDetails.explorerTxLink}${txDetails.tx.txid}`}
              >
                <MiddleEllipsis maxWidth='180px'>{txDetails.tx.txid}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>

          <Row variant='vertical' hidden={!txDetails.tradeTx}>
            <Row.Label>
              <Text translation={'transactionRow.amount'} />
            </Row.Label>
            <Row.Value>
              <Amount.Crypto
                value={fromBaseUnit(
                  txDetails.sellTx?.value ?? '0',
                  txDetails.sellAsset?.precision ?? 18
                )}
                symbol={txDetails.sellAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
              <Text translation='transactionRow.for' />
              <Amount.Crypto
                value={fromBaseUnit(
                  txDetails.buyTx?.value ?? '0',
                  txDetails.buyAsset?.precision ?? 18
                )}
                symbol={txDetails.buyAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
            </Row.Value>
          </Row>

          <Row variant='vertical'>
            <Row.Label>
              <Text translation='transactionRow.fee' />
            </Row.Label>
            <Row.Value>
              {txDetails.tx?.fee && txDetails.feeAsset && (
                <Amount.Crypto
                  value={fromBaseUnit(
                    txDetails.tx?.fee?.value ?? '0',
                    txDetails.feeAsset?.precision ?? 18
                  )}
                  symbol={txDetails.feeAsset.symbol}
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
              {txDetails.tx.status === chainAdapters.TxStatus.Confirmed && (
                <Tag colorScheme='green' size='lg'>
                  <CheckCircleIcon mr={2} />
                  <Text translation='transactionRow.confirmed' />
                </Tag>
              )}
              {txDetails.tx.status === chainAdapters.TxStatus.Pending && (
                <Tag colorScheme='blue' size='lg'>
                  <CircularProgress mr={2} size='5' />
                  <Text translation='transactionRow.pending' />
                </Tag>
              )}
              {txDetails.tx.status === chainAdapters.TxStatus.Failed && (
                <Tag colorScheme='red' size='lg'>
                  <WarningTwoIcon mr={2} />
                  <Text translation='transactionRow.failed' />
                </Tag>
              )}
            </Row.Value>
          </Row>
          <Row variant='vertical'>
            <Row.Label>
              <Text translation={'transactionRow.to'} />
            </Row.Label>
            <Row.Value>
              <Link
                isExternal
                color='blue.500'
                href={`${txDetails.explorerAddressLink}${txDetails.to ?? txDetails.from}`}
              >
                <MiddleEllipsis maxWidth='180px'>{txDetails.to ?? txDetails.from}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>
        </SimpleGrid>
      </Collapse>
    </>
  )
}
