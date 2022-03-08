import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Address } from './TransactionDetails/Address'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { TransactionGenericRow } from './TransactionGenericRow'
import { TransactionRowProps } from './TransactionRow'

export const TransactionSend = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen
}: TransactionRowProps) => {
  const marketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.tx.transfers[0].caip19)
  )
  const feeAssetMarketData = useAppSelector(state =>
    txDetails.feeAsset ? selectMarketDataById(state, txDetails.feeAsset?.caip19) : null
  )
  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        symbol={txDetails.symbol}
        assets={[
          {
            symbol: txDetails.symbol,
            amount: txDetails.value ?? '0',
            precision: txDetails.precision,
            currentPrice: marketData.price
          }
        ]}
        fee={{
          symbol: txDetails.feeAsset?.symbol ?? '',
          amount: txDetails.tx.fee?.value ?? '0',
          precision: txDetails.feeAsset?.precision ?? 0,
          currentPrice: feeAssetMarketData?.price ?? undefined
        }}
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
        <Row title='youSent'>
          <Amount
            value={txDetails.value ?? '0'}
            precision={txDetails.precision}
            symbol={txDetails.symbol}
          />
        </Row>
        <Row title='sentTo'>
          <Address
            explorerTxLink={txDetails.explorerTxLink}
            address={txDetails.to}
            ens={txDetails.ensTo}
          />
        </Row>
        {txDetails.feeAsset && (
          <Row title='minerFee'>
            <Amount
              value={txDetails.tx.fee?.value ?? '0'}
              precision={txDetails.feeAsset.precision}
              symbol={txDetails.feeAsset.symbol}
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
