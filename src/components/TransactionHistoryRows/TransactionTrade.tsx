import { Amount } from 'components/Amount/Amount'

import { useTradeFees } from './hooks'
import { Amount as TransactionAmount } from './TransactionDetails/Amount'
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

export const TransactionTrade = ({
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

  const { tradeFees } = useTradeFees({ txDetails })

  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
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
        <Transfers compactMode={compactMode} transfers={txDetails.tx.transfers} />
        <TxGrid compactMode={compactMode}>
          <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {txDetails.feeAsset && (
            <Row title='minerFee'>
              <TransactionAmount
                value={txDetails.tx.fee?.value ?? '0'}
                precision={txDetails.feeAsset.precision}
                symbol={txDetails.feeAsset.symbol}
              />
            </Row>
          )}
          {txDetails.tx.trade && (
            <Row title='orderRoute'>
              <Text value={txDetails.tx.trade.dexName} />
            </Row>
          )}
          {txDetails.tx.trade && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.trade.type} />
            </Row>
          )}
          {txDetails.tx.trade && txDetails.sellAsset && tradeFees && (
            <Row title='fee'>
              <Amount.Crypto value={tradeFees} symbol={txDetails.sellAsset.symbol} />
            </Row>
          )}
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
