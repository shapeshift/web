import { TransferType } from '@keepkey/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ContractMethod, Direction } from 'hooks/useTxDetails/useTxDetails'
import { bn } from 'lib/bignumber/bignumber'
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
import { AssetTypes, getTxMetadataWithAssetId, parseRelevantAssetFromTx } from './utils'

export const TransactionContract = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  let assets = []
  const txMetadata = useMemo(() => getTxMetadataWithAssetId(txDetails.tx.data), [txDetails.tx.data])
  if (txDetails.sellAsset) assets.push(parseRelevantAssetFromTx(txDetails, AssetTypes.Source))
  if (txDetails.buyAsset) assets.push(parseRelevantAssetFromTx(txDetails, AssetTypes.Destination))
  const translate = useTranslate()
  const isReceive = txDetails.tradeTx?.type === TransferType.Receive
  const interactsWithWithdrawMethod = txDetails.tx.data?.method === ContractMethod.Withdraw
  const isSend = txDetails.tradeTx?.type === TransferType.Send
  const i18n =
    isReceive && !txDetails.tx.data?.method ? txDetails.tradeTx?.type : txDetails.tx.data?.method
  const isFirstAssetOutgoing = interactsWithWithdrawMethod && isSend

  const isRevoke = useMemo(
    () =>
      Boolean(
        txMetadata?.method === 'approve' && txMetadata.value && bn(txMetadata.value).isZero(),
      ),
    [txMetadata],
  )
  const titlePrefix = translate(
    txDetails.tx.data?.parser
      ? `transactionRow.parser.${txDetails.tx.data?.parser}.${isRevoke ? 'revoke' : i18n}`
      : 'transactionRow.unknown',
  )

  // TODO(gomes): translation - we will need to revamp the prefix-suffix logic
  // to accomodate for different languages and their syntax
  const titleSuffix = isRevoke ? ' approval' : ''

  const asset = useAppSelector(state =>
    selectAssetById(state, getTxMetadataWithAssetId(txDetails.tx.data)?.assetId ?? ''),
  )

  const symbol = asset?.symbol ?? ''
  const title = symbol ? `${titlePrefix} ${symbol}${titleSuffix}` : titlePrefix

  return (
    <>
      <TransactionGenericRow
        type={txDetails.direction || ''}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title={title}
        blockTime={txDetails.tx.blockTime}
        symbol={txDetails.symbol}
        assets={assets}
        fee={parseRelevantAssetFromTx(txDetails, AssetTypes.Fee)}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        txData={txMetadata}
        showDateAndGuide={showDateAndGuide}
        isFirstAssetOutgoing={isFirstAssetOutgoing}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.tx.transfers} />
        <TxGrid compactMode={compactMode}>
          {txDetails.direction === Direction.InPlace &&
          // TODO(gomes): add isTransactionMetadata type guard
          txMetadata &&
          txMetadata?.assetId &&
          txMetadata?.value ? (
            <ApprovalAmount
              assetId={txMetadata.assetId}
              value={txMetadata.value}
              parser={txDetails.tx.data?.parser}
            />
          ) : null}
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.tx.trade && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.trade.dexName} />
            </Row>
          )}
          {txDetails.feeAsset && (
            <Row title='minerFee'>
              <Amount
                value={txDetails.tx.fee?.value ?? '0'}
                precision={txDetails.feeAsset.precision}
                symbol={txDetails.feeAsset.symbol}
              />
            </Row>
          )}
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
