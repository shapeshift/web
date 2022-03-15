import { SwapperType } from '@shapeshiftoss/types'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Address } from './TransactionDetails/Address'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { Text } from './TransactionDetails/Text'
import { TransactionId } from './TransactionDetails/TransactionId'
import { TransactionGenericRow } from './TransactionGenericRow'
import { TransactionRowProps } from './TransactionRow'

export const TransactionTrade = ({
  txDetails,
  showDateAndGuide,
  compactMode,
  isOpen,
  toggleOpen
}: TransactionRowProps) => {
  const sourceMarketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.sellTx?.caip19 ?? '')
  )
  const destinationMarketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.tradeTx?.caip19 ?? '')
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.tx.fee?.caip19 ?? '')
  )
  let assets = []
  if (txDetails.sellAsset)
    assets.push({
      symbol: txDetails.sellAsset.symbol,
      amount: txDetails.sellTx?.value ?? '0',
      precision: txDetails.sellAsset.precision,
      currentPrice: sourceMarketData?.price
    })
  if (txDetails.buyAsset)
    assets.push({
      symbol: txDetails.buyAsset.symbol,
      amount: txDetails.buyTx?.value ?? '0',
      precision: txDetails.buyAsset.precision,
      currentPrice: destinationMarketData?.price
    })
  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        symbol={txDetails.symbol}
        assets={assets}
        fee={{
          symbol: txDetails.feeAsset?.symbol ?? '',
          amount: txDetails.tx.fee?.value ?? '0',
          precision: txDetails.feeAsset?.precision ?? 0,
          currentPrice: feeAssetMarketData?.price
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
        {txDetails.tx.tradeDetails && (
          <Row title='orderRoute'>
            <Text
              value={
                txDetails.tx.tradeDetails.dexName === SwapperType.Thorchain ? 'Thorchain' : '0x'
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
        {txDetails.buyAsset && (
          <Row title='youReceived'>
            <Amount
              value={txDetails.buyTx?.value ?? '0'}
              precision={txDetails.buyAsset.precision}
              symbol={txDetails.buyAsset.symbol}
            />
          </Row>
        )}
        <Row title='receivedFrom'>
          <Address
            explorerTxLink={txDetails.explorerTxLink}
            address={txDetails.from}
            ens={txDetails.ensFrom}
          />
        </Row>
        <Row title='status'>
          <Status status={txDetails.tx.status} />
        </Row>
      </TransactionDetailsContainer>
    </>
  )
}
