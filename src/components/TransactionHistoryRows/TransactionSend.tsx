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

export const TransactionSend = ({
  txDetails,
  compactMode,
  isOpen,
  toggleOpen,
}: TransactionRowProps) => {
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send]),
    [txDetails.transfers],
  )

  const topLeft = useMemo(() => {
    return <RawText>Sent to {middleEllipsis(txDetails.transfers[0].to[0])}</RawText>
  }, [txDetails.transfers])

  const bottomRight = useMemo(() => {
    const precision = txDetails.transfers[0].asset.precision
    const amount = fromBaseUnit(txDetails.transfers[0].value, precision ?? FALLBACK_PRECISION)
    return (
      <FormatAmount.Crypto
        color='text.subtle'
        value={amount}
        symbol={txDetails.transfers[0].asset.symbol}
        maximumFractionDigits={4}
      />
    )
  }, [txDetails.transfers])

  const bottomleft = useMemo(() => {
    return <RawText>{txDetails.transfers[0].asset.symbol}</RawText>
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
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
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
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
