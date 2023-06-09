import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Method } from 'hooks/useTxDetails/useTxDetails'
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
import { getTransfersByType, getTxMetadataWithAssetId } from './utils'

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

  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const title = useMemo(() => {
    const symbol = asset?.symbol
    const titlePrefix = txMetadata.parser
      ? `transactionRow.parser.${txMetadata.parser}.${txMetadata.method}`
      : 'transactionRow.unknown'
    switch (txMetadata.method) {
      case 'approve':
      case 'revoke':
        // add symbol if available
        return symbol ? translate(`${titlePrefix}Symbol`, { symbol }) : translate(titlePrefix)
      default:
        return translate(titlePrefix)
    }
  }, [asset?.symbol, txMetadata.parser, txMetadata.method, translate])

  const type = useMemo(() => {
    switch (txMetadata.method) {
      case Method.AddLiquidityEth:
      case Method.BeginRedelegate:
      case Method.Delegate:
      case Method.Deposit:
      case Method.JoinPool:
      case Method.Stake:
      case Method.Transfer:
      case Method.TransferOut:
        return TransferType.Send
      case Method.BeginUnbonding:
      case Method.ClaimWithdraw:
      case Method.Exit:
      case Method.ExitPool:
      case Method.InstantUnstake:
      case Method.Out:
      case Method.Outbound:
      case Method.RecvPacket:
      case Method.Refund:
      case Method.RemoveLiquidityEth:
      case Method.Unstake:
      case Method.Withdraw:
      case Method.WithdrawDelegatorReward:
        return TransferType.Receive
      case Method.Approve:
      case Method.Revoke:
        return Method.Approve
      default: {
        const transferTypes = Object.keys(transfersByType)
        if (transferTypes.length === 1) return transferTypes[0] // known single direction
        return ''
      }
    }
  }, [transfersByType, txMetadata.method])

  return (
    <>
      <TransactionGenericRow
        type={type}
        status={txDetails.tx.status}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title={title}
        blockTime={txDetails.tx.blockTime}
        transfersByType={transfersByType}
        fee={txDetails.fee}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        txData={txMetadataWithAssetId}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
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
