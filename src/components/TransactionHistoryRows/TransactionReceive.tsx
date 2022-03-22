import { Address } from './TransactionDetails/Address'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { TransactionGenericRow } from './TransactionGenericRow'
import { TransactionRowProps } from './TransactionRow'
import { AssetTypes, parseRelevantAssetFromTx } from './utils'

export const TransactionReceive = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  toggleOpen,
  isOpen
}: TransactionRowProps) => {
  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        symbol={txDetails.symbol}
        assets={[parseRelevantAssetFromTx(txDetails, AssetTypes.Destination)]}
        fee={
          txDetails.tx?.fee &&
          txDetails.feeAsset &&
          parseRelevantAssetFromTx(txDetails, AssetTypes.Fee)
        }
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
        <Row title='youReceived'>
          <Amount
            value={txDetails.value ?? '0'}
            precision={txDetails.precision}
            symbol={txDetails.symbol}
          />
        </Row>
        <Row title='receivedFrom'>
          <Address
            explorerTxLink={txDetails.explorerTxLink}
            address={txDetails.from}
            ens={txDetails.ensFrom}
          />
        </Row>
        <Row title='minerFee'>
          {txDetails.tx?.fee && txDetails.feeAsset && (
            <Amount
              value={txDetails.tx.fee?.value}
              precision={txDetails.feeAsset?.precision ?? 0}
              symbol={txDetails.feeAsset?.symbol ?? ''}
            />
          )}
        </Row>
        <Row title='status'>
          <Status status={txDetails.tx.status} />
        </Row>
      </TransactionDetailsContainer>
    </>
  )
}
