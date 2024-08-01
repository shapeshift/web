import { ChevronRightIcon } from '@chakra-ui/icons'
import { Center, Flex, HStack } from '@chakra-ui/react'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { fromBaseUnit } from 'lib/math'

import { useTradeFees } from './hooks'
import { TransactionDate } from './TransactionDate'
import { Amount as TransactionAmount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import type { TransactionRowProps } from './TransactionRow'
import { TransactionTag } from './TransactionTag'
import { TransactionTeaser } from './TransactionTeaser'
import { getTransfersByType } from './utils'

const dividerStyle = { borderWidth: 0 }

export const TransactionTrade = ({
  txDetails,
  compactMode,
  isOpen,
  toggleOpen,
}: TransactionRowProps) => {
  const tradeFees = useTradeFees({ txDetails })
  const translate = useTranslate()

  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const divider = useMemo(
    () => (
      <Center
        bg='background.surface.raised.pressed'
        borderRadius='full'
        fontSize='md'
        color='text.subtle'
        style={dividerStyle}
      >
        <ChevronRightIcon />
      </Center>
    ),
    [],
  )

  const hasSend = transfersByType && transfersByType.Send && transfersByType.Send.length > 0
  const hasReceive =
    transfersByType && transfersByType.Receive && transfersByType.Receive.length > 0

  const topLeft = useMemo(() => {
    const title = !txDetails.tx.trade?.dexName
      ? translate('transactionRow.swap')
      : translate('transactionRow.swapWith', { dex: txDetails.tx.trade?.dexName })
    return (
      <Flex>
        <RawText>{title}</RawText>
        <TransactionTag txDetails={txDetails} transfersByType={transfersByType} />
      </Flex>
    )
  }, [transfersByType, translate, txDetails])

  const topRight = useMemo(() => {
    if (!hasReceive || !hasSend) return undefined
    const precision = transfersByType.Send[0].asset.precision ?? 0
    const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
    return (
      <Amount.Crypto
        value={amount}
        symbol={transfersByType.Send[0].asset.symbol}
        prefix='-'
        maximumFractionDigits={4}
        whiteSpace='nowrap'
      />
    )
  }, [hasReceive, hasSend, transfersByType.Send])

  const bottomleft = useMemo(() => {
    if (!transfersByType || !transfersByType.Send || transfersByType.Send.length === 0)
      return undefined
    if (transfersByType.Receive && transfersByType.Receive.length > 0) {
      return (
        <HStack divider={divider}>
          <RawText>{transfersByType.Send[0].asset.symbol}</RawText>
          <RawText>{transfersByType.Receive[0].asset.symbol}</RawText>
        </HStack>
      )
    } else {
      return <RawText>{transfersByType.Send[0].asset.symbol}</RawText>
    }
  }, [divider, transfersByType])

  const bottomRight = useMemo(() => {
    if (!transfersByType || !(transfersByType.Send && transfersByType.Send.length > 0))
      return undefined
    let dataType = TransferType.Send

    if (hasReceive) {
      dataType = TransferType.Receive
    }
    const precision = transfersByType[dataType][0].asset.precision ?? 0
    const amount = fromBaseUnit(transfersByType[dataType][0].value, precision)
    return (
      <Amount.Crypto
        maximumFractionDigits={4}
        value={amount}
        symbol={transfersByType[dataType][0].asset.symbol}
        color={hasReceive ? 'text.success' : 'text.subtle'}
        prefix={hasReceive ? '+' : ''}
        whiteSpace='nowrap'
      />
    )
  }, [hasReceive, transfersByType])

  return (
    <>
      <TransactionTeaser
        transfersByType={transfersByType}
        type={txDetails.type}
        status={txDetails.tx.status}
        topLeftRegion={topLeft}
        topRightRegion={topRight}
        bottomLeftRegion={bottomleft}
        bottomRightRegion={bottomRight}
        onToggle={toggleOpen}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        <TxGrid compactMode={compactMode}>
          <TransactionId txLink={txDetails.txLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {hasSend && (
            <Row title='minerFee'>
              {txDetails.fee ? (
                <TransactionAmount
                  value={txDetails.fee.value}
                  precision={txDetails.fee.asset.precision}
                  symbol={txDetails.fee.asset.symbol}
                />
              ) : (
                <RawText>{'--'}</RawText>
              )}
            </Row>
          )}
          {txDetails.tx.trade && (
            <Row title='orderRoute'>
              <Text value={txDetails.tx.trade.dexName} />
            </Row>
          )}
          {txDetails.tx.trade && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.trade.type} />
            </Row>
          )}
          {tradeFees && (
            <Row title='fee'>
              <Amount.Crypto value={tradeFees.value} symbol={tradeFees.asset.symbol} />
            </Row>
          )}
          <Row title='date'>
            {txDetails.tx.blockTime ? (
              <TransactionDate blockTime={txDetails.tx.blockTime} />
            ) : (
              <RawText>{'--'}</RawText>
            )}
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
