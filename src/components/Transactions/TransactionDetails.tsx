import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Collapse, Flex, Link, Tag } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import { TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'

export const TransactionDetails = ({
  txDetails,
  isOpen
}: {
  txDetails: TxDetails
  isOpen: boolean
}) => {
  return (
    <Collapse in={isOpen} unmountOnExit>
      <Box pl={10} pb={6}>
        <Row variant='vertical' pl={3} mb={6}>
          <Row.Label>
            <Text color='gray.600' translation='transactionHistory.txid' />
          </Row.Label>
          <Row.Value>
            <Link
              isExternal
              color='blue.200'
              href={`${txDetails.explorerTxLink}${txDetails.tx.txid}`}
            >
              <RawText>{txDetails.tx.txid}</RawText>
            </Link>
          </Row.Value>
        </Row>
        <Flex flex={1}>
          <Flex flex={2} pl={3} flexDir='column'>
            <Row hidden={!txDetails.tradeTx}>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.orderRoute' />
              </Flex>
              <Flex flex={1}>
                <RawText>0x</RawText>
              </Flex>
            </Row>
            <Row hidden={!txDetails.tradeTx}>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.transactionType' />
              </Flex>
              <Flex flex={1}>
                <RawText>{txDetails.tx.tradeDetails?.dexName}</RawText>
              </Flex>
            </Row>
            <Row hidden={!!txDetails.tradeTx}>
              <Flex flex={1}>
                <Text
                  color='gray.600'
                  translation={
                    txDetails.type === TxType.Send
                      ? 'transactionHistory.sentTo'
                      : 'transactionHistory.receivedFrom'
                  }
                />
              </Flex>
              <Flex flex={1}>
                <Link
                  isExternal
                  color='blue.200'
                  href={
                    txDetails.type === TxType.Send
                      ? `${txDetails.explorerAddressLink}${txDetails.ensTo ?? txDetails.to}`
                      : `${txDetails.explorerAddressLink}${txDetails.ensFrom ?? txDetails.from}`
                  }
                >
                  <MiddleEllipsis
                    address={
                      txDetails.type === TxType.Send
                        ? txDetails.ensTo ?? txDetails.to
                        : txDetails.ensFrom ?? txDetails.from
                    }
                  />
                </Link>
              </Flex>
            </Row>
            <Row>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionRow.status' />
              </Flex>
              <Flex flex={1}>
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
              </Flex>
            </Row>
          </Flex>
          <Flex flex={1} />
          <Flex flex={2} flexDir='column' pl={3}>
            <Row hidden={!txDetails.tradeTx}>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.youSent' />
              </Flex>
              <Flex flex={1}>
                <Amount.Crypto
                  value={fromBaseUnit(
                    txDetails.sellTx?.value ?? '0',
                    txDetails.sellAsset?.precision ?? 18
                  )}
                  symbol={txDetails.sellAsset?.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              </Flex>
            </Row>
            <Row hidden={!(txDetails.type === TxType.Send)}>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.youSent' />
              </Flex>
              <Flex flex={1}>
                <Amount.Crypto
                  value={fromBaseUnit(txDetails.value ?? '0', txDetails.precision ?? 18)}
                  symbol={txDetails.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              </Flex>
            </Row>
            <Row hidden={!txDetails.tradeTx}>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.youReceived' />
              </Flex>
              <Flex flex={1}>
                <Amount.Crypto
                  value={fromBaseUnit(
                    txDetails.buyTx?.value ?? '0',
                    txDetails.buyAsset?.precision ?? 18
                  )}
                  symbol={txDetails.buyAsset?.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              </Flex>
            </Row>
            <Row hidden={!(txDetails.type === TxType.Receive)}>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.youReceived' />
              </Flex>
              <Flex flex={1}>
                <Amount.Crypto
                  value={fromBaseUnit(txDetails.value ?? '0', txDetails.precision ?? 18)}
                  symbol={txDetails.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              </Flex>
            </Row>
            <Row>
              <Flex flex={1}>
                <Text color='gray.600' translation='transactionHistory.minerFee' />
              </Flex>
              <Flex flex={1}>
                <Amount.Crypto
                  value={
                    txDetails.tx.fee && txDetails.feeAsset
                      ? fromBaseUnit(txDetails.tx.fee.value, txDetails.feeAsset.precision)
                      : '0'
                  }
                  symbol={txDetails.feeAsset?.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              </Flex>
            </Row>
          </Flex>
          <Flex flex={1} />
        </Flex>
      </Box>
    </Collapse>
  )
}
