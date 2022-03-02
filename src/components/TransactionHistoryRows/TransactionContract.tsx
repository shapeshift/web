import { Flex } from '@chakra-ui/react'
import { useState } from 'react'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TransactionDetails } from './TransactionDetails'
import { TransactionGenericRow } from './TransactionGenericRow'

export const TransactionContract = ({
  txDetails,
  showDateAndGuide
}: {
  txDetails: TxDetails
  showDateAndGuide?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  const sourceMarketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.sellTx?.caip19 ?? '')
  )
  const destinationMarketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.tradeTx?.caip19 ?? '')
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.tradeTx?.caip19 ?? '')
  )
  return (
    <>
      <Flex alignItems='center' flex={1} as='button' w='full' py={4} onClick={toggleOpen}>
        <TransactionGenericRow
          type={txDetails.type}
          blockTime={txDetails.tx.blockTime}
          symbol={txDetails.symbol}
          assets={[
            {
              symbol: txDetails.sellAsset.symbol,
              amount: txDetails.sellTx?.value ?? '0',
              precision: txDetails.sellAsset.precision,
              currentPrice: sourceMarketData.price
            },
            {
              symbol: txDetails.buyAsset.symbol,
              amount: txDetails.buyTx?.value ?? '0',
              precision: txDetails.buyAsset.precision,
              currentPrice: destinationMarketData.price
            }
          ]}
          fee={{
            symbol: txDetails.feeAsset?.symbol ?? '',
            amount:
              txDetails.tx.fee && txDetails.feeAsset
                ? fromBaseUnit(txDetails.tx.fee.value, txDetails.feeAsset.precision)
                : '0',
            precision: txDetails.feeAsset.precision,
            currentPrice: feeAssetMarketData.price
          }}
          explorerTxLink={txDetails.explorerTxLink}
          txid={txDetails.tx.txid}
          showDateAndGuide={showDateAndGuide}
        />
      </Flex>
      <TransactionDetails isOpen={isOpen} txDetails={txDetails} />
    </>
  )
}
