import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import type { TransactionRowProps } from './TransactionRow'
import { AssetTypes, parseRelevantAssetFromTx } from './utils'

export const UnknownTransaction = ({
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
  return (
    <>
      <TransactionGenericRow
        type={''}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title='transactionRow.unknown'
        blockTime={txDetails.tx.blockTime}
        symbol={txDetails.symbol}
        assets={assets}
        fee={parseRelevantAssetFromTx(txDetails, AssetTypes.Fee)}
        explorerTxLink={txDetails.explorerTxLink}
        txid={txDetails.tx.txid}
        showDateAndGuide={showDateAndGuide}
        parentWidth={parentWidth}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        {txDetails.tx.transfers.length > 0 && (
          <Transfers compactMode={compactMode} transfers={txDetails.tx.transfers} />
        )}
        <TxGrid compactMode={compactMode}>
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.tx.trade && (
            <Row title='orderRoute'>
              <Text value={'0x'} />
            </Row>
          )}
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
