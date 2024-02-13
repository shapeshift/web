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

export const TransactionReceive = ({
  txDetails,
  compactMode,
  toggleOpen,
  isOpen,
}: TransactionRowProps) => {
  const translate = useTranslate()
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Receive]),
    [txDetails.transfers],
  )

  const isNft = useMemo(() => {
    return Object.values(transfersByType)
      .flat()
      .some(transfer => !!transfer.id)
  }, [transfersByType])

  const topLeft = useMemo(() => {
    return (
      <Flex gap={2}>
        <RawText>
          {translate('transactionHistory.receivedFrom', {
            address: middleEllipsis(transfersByType.Receive[0].from[0]),
          })}
        </RawText>
        <TransactionTag txDetails={txDetails} transfersByType={transfersByType} />
      </Flex>
    )
  }, [transfersByType, translate, txDetails])

  const bottomRight = useMemo(() => {
    const precision = transfersByType.Receive[0].asset.precision ?? 0
    const amount = fromBaseUnit(transfersByType.Receive[0].value, precision)
    return (
      <FormatAmount.Crypto
        color='text.success'
        value={amount}
        prefix='+'
        symbol={transfersByType.Receive[0].asset.symbol}
        maximumFractionDigits={4}
        abbreviated={true}
      />
    )
  }, [transfersByType.Receive])

  const bottomleft = useMemo(() => {
    if (isNft) {
      return <RawText>{transfersByType.Receive[0]?.token?.name ?? 'N/A'}</RawText>
    }
    return <RawText>{transfersByType.Receive[0].asset.symbol}</RawText>
  }, [isNft, transfersByType.Receive])

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
          <TransactionId txLink={txDetails.txLink} txid={txDetails.tx.txid} />
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
          <Row title='date'>
            <TransactionDate blockTime={txDetails.tx.blockTime} />
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
