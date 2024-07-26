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
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
  topRight,
}: TransactionRowProps) => {
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const minerFeeProps = useMemo(() => {
    if (!txDetails.fee) return
    return {
      value: txDetails.fee.value ?? '0',
      precision: txDetails.fee.asset.precision ?? 0,
      symbol: txDetails.fee.asset.symbol ?? '',
    }
  }, [txDetails.fee])

  const dateProps = useMemo(() => {
    if (!txDetails.tx.blockTime) return
    return {
      blockTime: txDetails.tx.blockTime,
    }
  }, [txDetails.tx.blockTime])

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
        parentWidth={parentWidth}
        txDetails={txDetails}
        topRight={topRight}
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
          {minerFeeProps !== undefined && (
            <Row title='minerFee'>
              <Amount {...minerFeeProps} />
            </Row>
          )}
          {dateProps !== undefined && (
            <Row title='date'>
              <TransactionDate blockTime={txDetails.tx.blockTime} />
            </Row>
          )}
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
