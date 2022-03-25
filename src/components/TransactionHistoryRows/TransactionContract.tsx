import { SwapperType } from '@shapeshiftoss/types'

import { Address } from './TransactionDetails/Address'
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
  parentWidth
}: TransactionRowProps) => {
  let assets = []
  if (txDetails.sellAsset) assets.push(parseRelevantAssetFromTx(txDetails, AssetTypes.Source))
  if (txDetails.buyAsset) assets.push(parseRelevantAssetFromTx(txDetails, AssetTypes.Destination))
  return (
    <>
      <TransactionGenericRow
        type={txDetails.direction || ''}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        title={
          txDetails.tx.data
            ? `transactionRow.parser.${txDetails.tx.data?.parser}.${txDetails.tx.data?.method}`
            : 'transactionRow.unknown'
        }
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
          {txDetails.tx.tradeDetails && (
            <Row title='orderRoute'>
              <Text
                value={
                  txDetails.tx.tradeDetails.dexName === SwapperType.Thorchain ? 'THORChain' : '0x'
                }
              />
            </Row>
          )}
          {txDetails.tx.tradeDetails && (
            <Row title='transactionType'>
              <Text value={txDetails.tx.tradeDetails.dexName} />
            </Row>
          )}
          {txDetails.sellAsset && (
            <Row title='youSent'>
              <Amount
                value={txDetails.sellTx?.value ?? '0'}
                precision={txDetails.sellAsset.precision}
                symbol={txDetails.sellAsset.symbol}
              />
            </Row>
          )}
          {txDetails.to && (
            <Row title='sentTo'>
              <Address
                explorerTxLink={txDetails.explorerTxLink}
                address={txDetails.to}
                ens={txDetails.ensTo}
              />
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
          {txDetails.buyAsset && (
            <Row title='youReceived'>
              <Amount
                value={txDetails.buyTx?.value ?? '0'}
                precision={txDetails.buyAsset.precision}
                symbol={txDetails.buyAsset.symbol}
              />
            </Row>
          )}
          {txDetails.from && (
            <Row title='receivedFrom'>
              <Address
                explorerTxLink={txDetails.explorerTxLink}
                address={txDetails.from}
                ens={txDetails.ensFrom}
              />
            </Row>
          )}
        </TxGrid>
      </TransactionDetailsContainer>
    </>
  )
}
