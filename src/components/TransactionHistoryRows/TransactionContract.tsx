import { TransferType } from '@shapeshiftoss/unchained-client'
import { useTranslate } from 'react-polyglot'
import { ContractMethod } from 'hooks/useTxDetails/useTxDetails'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import { TransactionRowProps } from './TransactionRow'
import { AssetTypes, isTokenMetadata, parseRelevantAssetFromTx } from './utils'

export const TransactionContract = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  let assets = []
  if (txDetails.sellAsset) assets.push(parseRelevantAssetFromTx(txDetails, AssetTypes.Source))
  if (txDetails.buyAsset) assets.push(parseRelevantAssetFromTx(txDetails, AssetTypes.Destination))
  const translate = useTranslate()
  const isReceive = txDetails.tradeTx?.type === TransferType.Receive
  const interactsWithWithdrawMethod = txDetails.tx.data?.method === ContractMethod.Withdraw
  const isSend = txDetails.tradeTx?.type === TransferType.Send
  const i18n =
    isReceive && !txDetails.tx.data?.method ? txDetails.tradeTx?.type : txDetails.tx.data?.method
  const isFirstAssetOutgoing = interactsWithWithdrawMethod && isSend

  const titlePrefix = translate(
    txDetails.tx.data?.parser
      ? `transactionRow.parser.${txDetails.tx.data?.parser}.${i18n}`
      : 'transactionRow.unknown',
  )

  const asset = useAppSelector(state =>
    selectAssetById(state, isTokenMetadata(txDetails.tx.data) ? txDetails.tx.data.assetId! : ''),
  )
  const symbol = asset?.symbol ?? ''
  const title = symbol ? `${titlePrefix} ${symbol}` : titlePrefix

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
        showDateAndGuide={showDateAndGuide}
        isFirstAssetOutgoing={isFirstAssetOutgoing}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <Transfers compactMode={compactMode} transfers={txDetails.tx.transfers} />
        <TxGrid compactMode={compactMode}>
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
