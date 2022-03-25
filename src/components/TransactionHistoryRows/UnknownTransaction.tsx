import { SwapperType } from '@shapeshiftoss/types'

import { Address } from './TransactionDetails/Address'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { TransactionGenericRow } from './TransactionGenericRow'
import { TransactionRowProps } from './TransactionRow'
import { AssetTypes, parseRelevantAssetFromTx } from './utils'

export const UnknownTransaction = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen
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
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        <TransactionId
          explorerTxLink={txDetails.explorerTxLink}
          txid={txDetails.tx.txid}
          compactMode={compactMode}
        />
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
              value={txDetails.sellTransfer?.value ?? '0'}
              precision={txDetails.sellAsset.precision}
              symbol={txDetails.sellAsset.symbol}
            />
          </Row>
        )}
        {txDetails.to && (
          <Row title='sentTo'>
            <Address
              explorerAddressLink={txDetails.explorerAddressLink}
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
              value={txDetails.buyTransfer?.value ?? '0'}
              precision={txDetails.buyAsset.precision}
              symbol={txDetails.buyAsset.symbol}
            />
          </Row>
        )}
        {txDetails.from && (
          <Row title='receivedFrom'>
            <Address
              explorerAddressLink={txDetails.explorerAddressLink}
              address={txDetails.from}
              ens={txDetails.ensFrom}
            />
          </Row>
        )}
        <Row title='status'>
          <Status status={txDetails.tx.status} />
        </Row>
      </TransactionDetailsContainer>
    </>
  )
}
