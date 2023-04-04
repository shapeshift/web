import type { Tx } from '../../../../../generated/optimism'
import { mempoolMock } from './mempoolMock'

const erc20Approve: Tx = {
  txid: '0x51e5634c49bbf2a027c3c7400f275a05943c26e8cbd0876a71e6161855284f27',
  blockHash: '0x43dac7243b817cb10057a1dfd0253c9aea29c51f28d0c9e2ca4bda136af91a85',
  blockHeight: 61385250,
  timestamp: 1673040389,
  status: 1,
  from: '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b',
  to: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
  confirmations: 2560,
  value: '0',
  fee: '53403000000',
  gasLimit: '213612',
  gasUsed: '53403',
  gasPrice: '1000000',
  inputData:
    '0x095ea7b3000000000000000000000000e0e112e8f33d3f437d1f895cbb1a456836125952ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
}

export default {
  tx: erc20Approve,
  txMempool: mempoolMock(erc20Approve),
}
