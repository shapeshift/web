import { TxType } from '@shapeshiftoss/chain-adapters'
import { ContractMethod } from 'hooks/useTxDetails/useTxDetails'

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
import { AssetTypes, parseRelevantAssetFromTx } from './utils'

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
  const isReceive = txDetails.tradeTx?.type === TxType.Receive
  const interactsWithWithdrawMethod = txDetails.tx.data?.method === ContractMethod.Withdraw
  const isSend = txDetails.tradeTx?.type === TxType.Send
  const i18n =
    isReceive && !txDetails.tx.data?.method ? txDetails.tradeTx?.type : txDetails.tx.data?.method
  const isFirstAssetOutgoing = interactsWithWithdrawMethod && isSend

  return (
    <>
      <TransactionGenericRow
        type={txDetails.direction || ''}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title={
          txDetails.tx.data
            ? `transactionRow.parser.${txDetails.tx.data?.parser}.${i18n}`
            : 'transactionRow.unknown'
        }
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
          {txDetails.tx.tradeDetails && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.tradeDetails.dexName} />
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
