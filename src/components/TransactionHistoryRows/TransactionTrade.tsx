import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { fromBaseUnit } from 'lib/math'

import { FALLBACK_PRECISION } from './constants'
import { useTradeFees } from './hooks'
import { Amount as TransactionAmount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import type { TransactionRowProps } from './TransactionRow'
import { TransactionTeaser } from './TransactionTeaser'
import { getTransfersByType } from './utils'

export const TransactionTrade = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  const tradeFees = useTradeFees({ txDetails })

  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const topLeft = useMemo(() => {
    return <RawText>Swap with {txDetails.tx.trade?.dexName}</RawText>
  }, [txDetails.tx.trade?.dexName])

  const topRight = useMemo(() => {
    const precision = transfersByType.Send[0].asset.precision
    const amount = fromBaseUnit(transfersByType.Send[0].value, precision ?? FALLBACK_PRECISION)
    return <Amount.Crypto value={amount} symbol={transfersByType.Send[0].asset.symbol} />
  }, [transfersByType.Send])

  const bottomleft = useMemo(() => {
    if (transfersByType.Receive && transfersByType.Receive?.length > 0) {
      return <RawText>{transfersByType.Receive[0].asset.symbol}</RawText>
    } else {
      return <RawText>{transfersByType.Send[0].asset.symbol}</RawText>
    }
  }, [transfersByType.Receive, transfersByType.Send])

  const bottomRight = useMemo(() => {
    let dataType = TransferType.Send
    if (transfersByType.Receive && transfersByType.Receive?.length > 0) {
      dataType = TransferType.Receive
    }
    const precision = transfersByType[dataType][0].asset.precision
    const amount = fromBaseUnit(transfersByType[dataType][0].value, precision ?? FALLBACK_PRECISION)
    return (
      <Amount.Crypto
        maximumFractionDigits={4}
        value={amount}
        symbol={transfersByType[dataType][0].asset.symbol}
        color='text.success'
        prefix='+'
      />
    )
  }, [transfersByType])

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
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        <TxGrid compactMode={compactMode}>
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.fee && (
            <Row title='minerFee'>
              <TransactionAmount
                value={txDetails.fee.value}
                precision={txDetails.fee.asset.precision}
                symbol={txDetails.fee.asset.symbol}
              />
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
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
