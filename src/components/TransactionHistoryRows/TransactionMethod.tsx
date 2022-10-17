import { TransferType } from '@shapeshiftoss/unchained-client'
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
  const txMetadata = txDetails.tx.data! // we are guaranteed to have had metadata to render this component
  const txMetadataWithAssetId = getTxMetadataWithAssetId(txMetadata)

  const titlePrefix = translate(
    txMetadata.parser
      ? `transactionRow.parser.${txMetadata.parser}.${txMetadata.method}`
      : 'transactionRow.unknown',
  )

  // TODO(gomes): translation - we will need to revamp the prefix-suffix logic
  // to accomodate for different languages and their syntax
  const titleSuffix = txMetadata.method === 'revoke' ? ' approval' : ''

  const asset = useAppSelector(state =>
    selectAssetById(state, txMetadataWithAssetId?.assetId ?? ''),
  )

  const symbol = asset?.symbol
  const title = symbol ? `${titlePrefix} ${symbol}${titleSuffix}` : titlePrefix

  const displayTransfers = getDisplayTransfers(txDetails.transfers, [
    TransferType.Send,
    TransferType.Receive,
  ])

  const type = (() => {
    switch (txMetadata.method) {
      case Method.Deposit:
      case Method.AddLiquidityEth:
      case Method.TransferOut:
      case Method.Stake:
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
        return TransferType.Receive
      case Method.Approve:
      case Method.Revoke:
        return Method.Approve
      default: {
        if (displayTransfers.length === 1) return displayTransfers[0].type // known single direction
        return ''
      }
    }
  })()

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
