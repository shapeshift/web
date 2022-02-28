import { Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useState } from 'react'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TransactionDetails } from './TransactionDetails'
import { TransactionGenericRow } from './TransactionGenericRow'

export const TransactionReceive = ({
  txDetails,
  showDateAndGuide
}: {
  txDetails: TxDetails
  activeAsset?: Asset
  showDateAndGuide?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  const price = useAppSelector(state => selectMarketDataById(state, txDetails.tx.caip2))
  console.info(price, txDetails)
  return (
    <>
      <Flex alignItems='center' flex={1} as='button' w='full' py={4} onClick={toggleOpen}>
        <TransactionGenericRow
          type={txDetails.type}
          blockTime={txDetails.tx.blockTime}
          symbol={txDetails.symbol}
          assets={[
            {
              symbol: txDetails.symbol,
              amount: txDetails.value,
              precision: txDetails.precision
            }
          ]}
          fee={{
            symbol: txDetails.feeAsset?.symbol ?? '',
            amount:
              txDetails.tx.fee && txDetails.feeAsset
                ? fromBaseUnit(txDetails.tx.fee.value, txDetails.feeAsset.precision)
                : '0',
            precision: txDetails.feeAsset?.precision
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
