import { UNI_V2_FOX_STAKING_REWARDS_V3 } from '@shapeshiftoss/contracts'

import { mempoolMock } from './mempoolMock'

const foxStake = {
  txid: '0x253585eae87ebbb6b81c0fa6c6fe3894fb8afb2fb8c7073f7c4b28915aebd2a7',
  blockHash: '0x265087ce9f2a67227637d2f9680bc2916c61c980a6097ca46be51e864c60b156',
  blockHeight: 12878348,
  timestamp: 1626986096,
  status: 1,
  from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
  to: UNI_V2_FOX_STAKING_REWARDS_V3,
  confirmations: 1934893,
  value: '0',
  fee: '4650509500000000',
  gasLimit: '128636',
  gasUsed: '102209',
  gasPrice: '45500000000',
  inputData: '0xa694fc3a0000000000000000000000000000000000000000000000000161c0b44c0353ce',
  tokenTransfers: [
    {
      contract: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      decimals: 18,
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: UNI_V2_FOX_STAKING_REWARDS_V3,
      value: '99572547380794318',
    },
  ],
}

export default {
  tx: foxStake,
  txMempool: mempoolMock(foxStake),
}
