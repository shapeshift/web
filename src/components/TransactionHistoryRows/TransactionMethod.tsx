import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Method } from 'hooks/useTxDetails/useTxDetails'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Amount } from './TransactionDetails/Amount'
import { ApprovalAmount } from './TransactionDetails/ApprovalAmount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import type { TransactionRowProps } from './TransactionRow'
import { getDisplayTransfers, getTxMetadataWithAssetId } from './utils'

export const TransactionMethod = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  const translate = useTranslate()
  const txMetadata = useMemo(() => txDetails.tx.data!, [txDetails.tx.data]) // we are guaranteed to have had metadata to render this component
  const txMetadataWithAssetId = useMemo(() => getTxMetadataWithAssetId(txMetadata), [txMetadata])

  const asset = useAppSelector(state =>
    selectAssetById(state, txMetadataWithAssetId?.assetId ?? ''),
  )

  const displayTransfers = useMemo(
    () => getDisplayTransfers(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const titlePrefix = translate(
    txMetadata.parser
      ? `transactionRow.parser.${txMetadata.parser}.${txMetadata.method}`
      : 'transactionRow.unknown',
  )

  const title = useMemo(() => {
    const symbol = asset?.symbol

    switch (txMetadata.method) {
      case 'approve':
        return `${titlePrefix} ${symbol}`
      case 'revoke':
        return `${titlePrefix} ${symbol} approval`
      default:
        return titlePrefix
    }
  }, [asset?.symbol, titlePrefix, txMetadata.method])

  const type = useMemo(() => {
    switch (txMetadata.method) {
      case Method.Deposit:
      case Method.AddLiquidityEth:
      case Method.TransferOut:
      case Method.Stake:
      case Method.Delegate:
      case Method.BeginRedelegate:
      case Method.Transfer:
        return TransferType.Send
      case Method.Withdraw:
      case Method.RemoveLiquidityEth:
      case Method.Unstake:
      case Method.InstantUnstake:
      case Method.ClaimWithdraw:
      case Method.Exit:
      case Method.Outbound:
      case Method.Out:
      case Method.Refund:
      case Method.BeginUnbonding:
      case Method.WithdrawDelegatorReward:
      case Method.RecvPacket:
        return TransferType.Receive
      case Method.Approve:
      case Method.Revoke:
        return Method.Approve
      default: {
        logger.warn(`unhandled method: ${txMetadata.method}`)
        if (displayTransfers.length === 1) return displayTransfers[0].type // known single direction
        return ''
      }
    }
  }, [displayTransfers, txMetadata.method])

  return (
    <>
      <TransactionGenericRow
        type={type}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title={title}
        blockTime={txDetails.tx.blockTime}
        displayTransfers={displayTransfers}
        fee={txDetails.fee}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        txData={txMetadataWithAssetId}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.tx.transfers} />
        <TxGrid compactMode={compactMode}>
          {(txMetadata.method === 'approve' || txMetadata.method === 'revoke') &&
            txMetadataWithAssetId?.assetId &&
            txMetadataWithAssetId?.value && (
              // TODO(gomes): add isTransactionMetadata type guard
              <ApprovalAmount
                assetId={txMetadataWithAssetId.assetId}
                value={txMetadataWithAssetId.value}
                parser={txMetadataWithAssetId.parser}
              />
            )}
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
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
