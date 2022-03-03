import { Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useState } from 'react'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Address } from './TransactionDetails/Address'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
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
  const marketData = useAppSelector(state =>
    selectMarketDataById(state, txDetails.tx.transfers[0].caip19)
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
              symbol: txDetails.symbol,
              amount: txDetails.value,
              precision: txDetails.precision,
              currentPrice: marketData.price
            }
          ]}
          fee={{
            symbol: txDetails.feeAsset?.symbol ?? '',
            amount:
              txDetails.tx.fee && txDetails.feeAsset
                ? fromBaseUnit(txDetails.tx.fee.value, txDetails.feeAsset.precision)
                : '0',
            precision: txDetails.feeAsset?.precision,
            // Receive does not have 'fee'
            currentPrice: '0'
          }}
          explorerTxLink={txDetails.explorerTxLink}
          txid={txDetails.tx.txid}
          showDateAndGuide={showDateAndGuide}
        />
      </Flex>
      <TransactionDetailsContainer isOpen={isOpen}>
        <TransactionId explorerTxLink={txDetails.explorerTxLink} txid={txDetails.tx.txid} />
        <Row title='youReceived'>
          <Amount
            value={txDetails.value}
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
          <Amount
            value={txDetails.tx.fee?.value ?? '0'}
            precision={txDetails.feeAsset?.precision}
            symbol={txDetails.feeAsset?.symbol}
          />
        </Row>
        <Row title='status'>
          <Status status={txDetails.tx.status} />
        </Row>
      </TransactionDetailsContainer>
    </>
  )
}
