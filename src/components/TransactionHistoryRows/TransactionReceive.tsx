import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { Amount as FormatAmount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'

import { FALLBACK_PRECISION } from './constants'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import type { TransactionRowProps } from './TransactionRow'
import { TransactionTeaser } from './TransactionTeaser'
import { getTransfersByType } from './utils'

export const TransactionReceive = ({
  txDetails,
  compactMode,
  toggleOpen,
  isOpen,
}: TransactionRowProps) => {
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Receive]),
    [txDetails.transfers],
  )

  const topLeft = useMemo(() => {
    return <RawText>Received from {middleEllipsis(transfersByType.Receive[0].from[0])}</RawText>
  }, [transfersByType.Receive])

  const bottomRight = useMemo(() => {
    const precision = transfersByType.Receive[0].asset.precision
    const amount = fromBaseUnit(transfersByType.Receive[0].value, precision ?? FALLBACK_PRECISION)
    return (
      <FormatAmount.Crypto
        color='text.success'
        value={amount}
        prefix='+'
        symbol={transfersByType.Receive[0].asset.symbol}
      />
    )
  }, [transfersByType.Receive])

  const bottomleft = useMemo(() => {
    return <RawText>{transfersByType.Receive[0].asset.symbol}</RawText>
  }, [transfersByType.Receive])

  return (
    <>
      <TransactionTeaser
        transfersByType={transfersByType}
        type={txDetails.type}
        status={txDetails.tx.status}
        topLeftRegion={topLeft}
        bottomLeftRegion={bottomleft}
        bottomRightRegion={bottomRight}
        onToggle={toggleOpen}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        <TxGrid compactMode={compactMode}>
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          <Row title='minerFee'>
            <Amount
              value={txDetails.fee?.value ?? '0'}
              precision={txDetails.fee?.asset?.precision ?? 0}
              symbol={txDetails.fee?.asset.symbol ?? ''}
            />
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
