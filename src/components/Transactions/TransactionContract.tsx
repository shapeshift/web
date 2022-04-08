import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Collapse, Flex, Link, SimpleGrid } from '@chakra-ui/react'
import { TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import { useState } from 'react'
import { FaStickyNote, FaThumbsUp } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TransactionStatus } from 'components/Transactions/TransactionStatus'
import { ContractMethod, TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'

export const TransactionContract = ({ txDetails }: { txDetails: TxDetails }) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)

  const toAddress = txDetails.ensTo || txDetails.to || undefined

  const transactionIcon = (() => {
    switch (txDetails.direction) {
      case 'in-place':
        return <FaThumbsUp />
      case 'outbound':
        return <ArrowUpIcon />
      case 'inbound':
        return <ArrowDownIcon color='green.500' />
      default:
        return <FaStickyNote />
    }
  })()

  const isReceive = txDetails.tradeTx?.type === TxType.Receive
  const interactsWithWithdrawMethod = txDetails.tx.data?.method === ContractMethod.Withdraw
  const isSend = txDetails.tradeTx?.type === TxType.Send
  const i18n = isReceive ? txDetails.tradeTx?.type : txDetails.tx.data?.method
  const sendInteractsWithWithdrawMethod = interactsWithWithdrawMethod && isSend

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
          <IconCircle mr={3}>{transactionIcon}</IconCircle>

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
                translation={[
                  `transactionRow.parser.${txDetails.tx.data?.parser}.${i18n}`,
                  { symbol: '' },
                ]}
              />
              <RawText color='gray.500' fontSize='sm' lineHeight='1'>
                {dayjs(txDetails.tx.blockTime * 1000).fromNow()}
              </RawText>
            </Box>

            <Flex flexDir='column' ml='auto' textAlign='right'>
              {txDetails.direction !== 'in-place' && txDetails.value && (
                <Amount.Crypto
                  {...(txDetails.direction === 'inbound'
                    ? { color: 'green.500' }
                    : { color: 'inherit', prefix: '-' })}
                  prefix={sendInteractsWithWithdrawMethod ? '-' : ''}
                  value={fromBaseUnit(txDetails.value, txDetails.precision)}
                  symbol={txDetails.symbol}
                  maximumFractionDigits={6}
                />
              )}
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
                <MiddleEllipsis address={txDetails.tx.txid} />
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
                  txDetails.sellTransfer?.value ?? '0',
                  txDetails.sellAsset?.precision ?? 18,
                )}
                symbol={txDetails.sellAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
              <Text translation='transactionRow.for' />
              <Amount.Crypto
                value={fromBaseUnit(
                  txDetails.buyTransfer?.value ?? '0',
                  txDetails.buyAsset?.precision ?? 18,
                )}
                symbol={txDetails.buyAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
            </Row.Value>
          </Row>

          {txDetails.tx?.fee && txDetails.feeAsset && (
            <Row variant='vertical'>
              <Row.Label>
                <Text translation='transactionRow.fee' />
              </Row.Label>
              <Row.Value>
                <Amount.Crypto
                  value={fromBaseUnit(
                    txDetails.tx?.fee?.value,
                    txDetails.feeAsset?.precision ?? 18,
                  )}
                  symbol={txDetails.feeAsset.symbol}
                  maximumFractionDigits={6}
                />
              </Row.Value>
            </Row>
          )}
          <TransactionStatus txStatus={txDetails.tx.status} />
          {toAddress && (
            <Row variant='vertical'>
              <Row.Label>
                <Text translation={'transactionRow.to'} />
              </Row.Label>
              <Row.Value>
                <Link
                  isExternal
                  color='blue.500'
                  href={`${txDetails.explorerAddressLink}${toAddress}`}
                >
                  <MiddleEllipsis address={toAddress} />
                </Link>
              </Row.Value>
            </Row>
          )}
        </SimpleGrid>
      </Collapse>
    </>
  )
}
