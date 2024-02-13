import { Flex } from '@chakra-ui/react'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount as FormatAmount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'

import { TransactionDate } from './TransactionDate'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import type { TransactionRowProps } from './TransactionRow'
import { TransactionTag } from './TransactionTag'
import { TransactionTeaser } from './TransactionTeaser'
import { getTransfersByType } from './utils'

export const TransactionSend = ({
  txDetails,
  compactMode,
  isOpen,
  toggleOpen,
}: TransactionRowProps) => {
  const translate = useTranslate()
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send]),
    [txDetails.transfers],
  )

  const topLeft = useMemo(() => {
    return (
      <Flex gap={2}>
        <RawText>
          {translate('transactionHistory.sentTo', {
            address: middleEllipsis(txDetails.transfers[0].to[0]),
          })}
        </RawText>
        <TransactionTag txDetails={txDetails} transfersByType={transfersByType} />
      </Flex>
    )
  }, [transfersByType, translate, txDetails])

  const bottomRight = useMemo(() => {
    const precision = txDetails.transfers[0].asset.precision ?? 0
    const amount = fromBaseUnit(txDetails.transfers[0].value, precision)
    const symbol = txDetails.transfers[0].asset.symbol
    return (
      <FormatAmount.Crypto
        color='text.subtle'
        value={amount}
        prefix='-'
        symbol={symbol}
        maximumFractionDigits={4}
        whiteSpace='nowrap'
      />
    )
  }, [txDetails.transfers])

  const bottomleft = useMemo(() => {
    const symbol = txDetails.transfers[0].asset.symbol
    return <RawText>{symbol}</RawText>
  }, [txDetails.transfers])

  return (
    <>
      <TransactionTeaser
        transfersByType={transfersByType}
        type={txDetails.type}
        topLeftRegion={topLeft}
        bottomRightRegion={bottomRight}
        bottomLeftRegion={bottomleft}
        status={txDetails.tx.status}
        onToggle={toggleOpen}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        <TxGrid compactMode={compactMode}>
          <TransactionId txLink={txDetails.txLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.fee && (
            <Row title='minerFee'>
              <Amount
                value={txDetails.fee.value}
                precision={txDetails.fee.asset.precision}
                symbol={txDetails.fee.asset.symbol}
              />
            </Row>
          )}
          <Row title='date'>
            <TransactionDate blockTime={txDetails.tx.blockTime} />
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
