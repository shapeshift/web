/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Box, Container } from '@chakra-ui/react'
import { ethereum } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { EthReceive, EthSend } from 'test/mocks/txs'
import { TestProviders } from 'test/TestProviders'
import { TransactionReceive } from 'components/TransactionHistoryRows/TransactionReceive'
import { TransactionSend } from 'components/TransactionHistoryRows/TransactionSend'
import { TransactionStake } from 'components/TransactionHistoryRows/TransactionStake'
import { TransactionUnstake } from 'components/TransactionHistoryRows/TransactionUnstake'
import {
  getBuyTransfer,
  getStandardTx,
  StakeType,
  TxDetails,
} from 'hooks/useTxDetails/useTxDetails'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'

export default {
  title: 'TxHistory/TransactionRow',
  decorators: [
    (Story: any) => (
      <TestProviders>
        <Container maxW='1000px' mt='40px'>
          <Story />
        </Container>
      </TestProviders>
    ),
  ],
}

const standardTx = getStandardTx(EthSend)!
const standardTxReceive = getStandardTx(EthReceive)!

const EthSendTxDetails: TxDetails = {
  tx: EthSend,
  sellTransfer: getBuyTransfer(EthSend),
  sellAsset: ethereum,
  to: standardTx.to,
  from: standardTx.from,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
  type: standardTx.type,
  value: standardTx.value,
  symbol: ethereum.symbol,
  precision: ethereum.precision,
  sourceMarketData: mockMarketData(),
  destinationMarketData: mockMarketData(),
  feeMarketData: mockMarketData(),
}

const EthReceiveTxDetails: TxDetails = {
  tx: EthReceive,
  buyTransfer: getBuyTransfer(EthReceive),
  buyAsset: ethereum,
  to: standardTxReceive.to,
  from: standardTxReceive.from,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
  type: standardTxReceive.type,
  value: standardTxReceive.value,
  symbol: ethereum.symbol,
  precision: ethereum.precision,
  sourceMarketData: mockMarketData(),
  destinationMarketData: mockMarketData(),
  feeMarketData: mockMarketData(),
}

const EthStakeTxDetails: TxDetails = {
  tx: EthSend,
  sellTransfer: getBuyTransfer(EthSend),
  sellAsset: ethereum,
  to: standardTx.to,
  from: standardTx.from,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
  type: StakeType.Stake,
  value: standardTx.value,
  symbol: ethereum.symbol,
  precision: ethereum.precision,
  sourceMarketData: mockMarketData(),
  destinationMarketData: mockMarketData(),
  feeMarketData: mockMarketData(),
}

const EthUnstakeTxDetails: TxDetails = {
  tx: EthReceive,
  buyTransfer: getBuyTransfer(EthReceive),
  buyAsset: ethereum,
  to: standardTxReceive.to,
  from: standardTxReceive.from,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
  type: StakeType.Unstake,
  value: standardTxReceive.value,
  symbol: ethereum.symbol,
  precision: ethereum.precision,
  sourceMarketData: mockMarketData(),
  destinationMarketData: mockMarketData(),
  feeMarketData: mockMarketData(),
}

export const Send = () => {
  useGetAssetsQuery()
  return (
    <Box
      width='full'
      rounded='lg'
      _hover={{ bg: 'gray.100' }}
      bg={'gray.100'}
      borderColor={'transparent'}
      borderWidth={1}
    >
      <TransactionSend
        txDetails={EthSendTxDetails}
        showDateAndGuide={true}
        compactMode={false}
        toggleOpen={() => {}}
        isOpen={true}
        parentWidth={1000}
      />
    </Box>
  )
}

export const Receive = () => {
  return (
    <Box
      width='full'
      rounded='lg'
      _hover={{ bg: 'gray.100' }}
      bg={'gray.100'}
      borderColor={'transparent'}
      borderWidth={1}
    >
      <TransactionReceive
        txDetails={EthReceiveTxDetails}
        showDateAndGuide={true}
        compactMode={false}
        toggleOpen={() => {}}
        isOpen={true}
        parentWidth={1000}
      />
    </Box>
  )
}

export const Stake = () => {
  return (
    <Box
      width='full'
      rounded='lg'
      _hover={{ bg: 'gray.100' }}
      bg={'gray.100'}
      borderColor={'transparent'}
      borderWidth={1}
    >
      <TransactionStake
        txDetails={EthStakeTxDetails}
        showDateAndGuide={true}
        compactMode={false}
        toggleOpen={() => {}}
        isOpen={true}
        parentWidth={1000}
      />
    </Box>
  )
}

export const Unstake = () => {
  return (
    <Box
      width='full'
      rounded='lg'
      _hover={{ bg: 'gray.100' }}
      bg={'gray.100'}
      borderColor={'transparent'}
      borderWidth={1}
    >
      <TransactionUnstake
        txDetails={EthUnstakeTxDetails}
        showDateAndGuide={true}
        compactMode={false}
        toggleOpen={() => {}}
        isOpen={true}
        parentWidth={1000}
      />
    </Box>
  )
}
