import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'
import { Method } from 'hooks/useTxDetails/useTxDetails'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TransactionDate } from './TransactionDate'
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
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
  topRight,
}: TransactionRowProps) => {
  const translate = useTranslate()
  const txMetadata = useMemo(() => txDetails.tx.data!, [txDetails.tx.data]) // we are guaranteed to have had metadata to render this component
  const { method, parser } = txMetadata
  const txMetadataWithAssetId = useMemo(() => getTxMetadataWithAssetId(txMetadata), [txMetadata])

  const asset = useAppSelector(state =>
    selectAssetById(state, txMetadataWithAssetId?.assetId ?? ''),
  )

  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const hasSend = useMemo(() => {
    return transfersByType && transfersByType.Send && transfersByType.Send.length > 0
  }, [transfersByType])

  const title = useMemo(() => {
    const symbol = asset?.symbol
    const titlePrefix = (() => {
      switch (true) {
        case method !== undefined && parser !== undefined:
          return `transactionRow.parser.${parser}.${method}`
        default:
          return 'transactionRow.common'
      }
    })()

    switch (method) {
      case 'approve':
      case 'revoke':
        // add symbol if available
        return symbol ? translate(`${titlePrefix}Symbol`, { symbol }) : translate(titlePrefix)
      default:
        return translate(titlePrefix)
    }
  }, [asset?.symbol, method, parser, translate])

  const type = useMemo(() => {
    switch (method) {
      case Method.AddLiquidityEth:
      case Method.BeginRedelegate:
      case Method.Delegate:
      case Method.Deposit:
      case Method.JoinPool:
      case Method.LoanOpen:
      case Method.LoanRepayment:
      case Method.Stake:
      case Method.Transfer:
      case Method.Withdraw:
        return TransferType.Send
      case Method.BeginUnbonding:
      case Method.ClaimWithdraw:
      case Method.DepositRefund:
      case Method.ExecuteTransaction:
      case Method.Exit:
      case Method.ExitPool:
      case Method.InstantUnstake:
      case Method.LoanOpenOut:
      case Method.LoanOpenRefund:
      case Method.LoanRepaymentOut:
      case Method.LoanRepaymentRefund:
      case Method.Out:
      case Method.RecvPacket:
      case Method.Refund:
      case Method.RemoveLiquidityEth:
      case Method.Reward:
      case Method.SwapOut:
      case Method.SwapRefund:
      case Method.Unstake:
      case Method.WithdrawDelegatorReward:
      case Method.WithdrawOut:
        return TransferType.Receive
      case Method.Approve:
      case Method.Revoke:
        return Method.Approve
      case Method.DepositRefundNative:
      case Method.LoanRepaymentRefundNative:
      case Method.WithdrawNative:
        return method
      default: {
        const transferTypes = Object.keys(transfersByType)
        if (transferTypes.length === 1) return transferTypes[0] // known single direction
        return ''
      }
    }
  }, [transfersByType, method])

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
        txLink={txDetails.txLink}
        txid={txDetails.tx.txid}
        txData={txMetadata}
        parentWidth={parentWidth}
        txDetails={txDetails}
        topRight={topRight}
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
          <TransactionId txLink={txDetails.txLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.tx.trade && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.trade.dexName} />
            </Row>
          )}
          {hasSend && (
            <Row title='minerFee'>
              {txDetails.fee ? (
                <Amount
                  value={txDetails.fee.value}
                  precision={txDetails.fee.asset.precision}
                  symbol={txDetails.fee.asset.symbol}
                />
              ) : (
                <RawText>{'--'}</RawText>
              )}
            </Row>
          )}
          <Row title='date'>
            {txDetails.tx.blockTime ? (
              <TransactionDate blockTime={txDetails.tx.blockTime} />
            ) : (
              <RawText>{'--'}</RawText>
            )}
          </Row>
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
