import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'

import { TransactionDate } from './TransactionDate'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import type { TransactionRowProps } from './TransactionRow'
import { getTransfersByType } from './utils'

export const TransactionCommon = ({
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
        type={txDetails.type}
        status={txDetails.tx.status}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        transfersByType={transfersByType}
        fee={txDetails.fee}
        txLink={txDetails.txLink}
        txid={txDetails.tx.txid}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
        txDetails={txDetails}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        {txDetails.transfers.length > 0 && (
          <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        )}
        <TxGrid compactMode={compactMode}>
          <TransactionId txLink={txDetails.txLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          <Row title='minerFee'>
            <Amount
              value={txDetails.fee?.value ?? '0'}
              precision={txDetails.fee?.asset.precision ?? 0}
              symbol={txDetails.fee?.asset.symbol ?? ''}
            />
          </Row>
          <Row title='date'>
            <TransactionDate blockTime={txDetails.tx.blockTime} />
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
