import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'

import { Amount } from './TransactionDetails/Amount'
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

export const UnknownTransaction = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  return (
    <>
      <TransactionGenericRow
        type={''}
        status={txDetails.tx.status}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title='transactionRow.unknown'
        blockTime={txDetails.tx.blockTime}
        transfersByType={transfersByType}
        fee={txDetails.fee}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        {txDetails.transfers.length > 0 && (
          <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        )}
        <TxGrid compactMode={compactMode}>
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.tx.trade && (
            <Row title='orderRoute'>
              <Text value={'0x'} />
            </Row>
          )}
          {txDetails.tx.trade && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.trade.dexName} />
            </Row>
          )}
          {txDetails.fee && (
            <Row title='minerFee'>
              <Amount
                value={txDetails.fee.value}
                precision={txDetails.fee.asset.precision}
                symbol={txDetails.fee.asset.symbol}
              />
            </Row>
          )}
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
