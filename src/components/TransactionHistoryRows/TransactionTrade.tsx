import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'

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
import { getTransfersByType } from './utils'

export const TransactionTrade = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  const tradeFeeInput = useMemo(() => ({ txDetails }), [txDetails])
  const { tradeFees } = useTradeFees({ txDetails: tradeFeeInput.txDetails })

  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        status={txDetails.tx.status}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        transfersByType={transfersByType}
        fee={txDetails.fee}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
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
