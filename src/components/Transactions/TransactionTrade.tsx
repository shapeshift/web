import { Flex } from '@chakra-ui/react'
import { useState } from 'react'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'

import { TransactionDetails } from './TransactionDetails'
import { TransactionGenericRow } from './TransactionGenericRow'

export const TransactionTrade = ({
  txDetails,
  showDateAndGuide
}: {
  txDetails: TxDetails
  showDateAndGuide?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  console.info(txDetails)
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
              precision: txDetails.sellAsset.precision
            },
            {
              symbol: txDetails.buyAsset.symbol,
              amount: txDetails.buyTx?.value ?? '0',
              precision: txDetails.buyAsset.precision
            }
          ]}
          fee={{
            symbol: txDetails.feeAsset?.symbol ?? '',
            amount:
              txDetails.tx.fee && txDetails.feeAsset
                ? fromBaseUnit(txDetails.tx.fee.value, txDetails.feeAsset.precision)
                : '0',
            precision: txDetails.feeAsset.precision
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
