import { UNI_V2_FOX_STAKING_REWARDS_V3 } from '@shapeshiftoss/contracts'

import { mempoolMock } from './mempoolMock'

const foxExit = {
  txid: '0x1c676dd29be457b091e1ecb6578b6614d3f084df610876dfd196e6125fc3f6d6',
  blockHash: '0xe0aec5e08be120be859880700b5d5a4927e65f35611b3d220bc7629677707137',
  blockHeight: 12878219,
  timestamp: 1626984360,
  status: 1,
  from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
  to: UNI_V2_FOX_STAKING_REWARDS_V3,
  confirmations: 1935013,
  value: '0',
  fee: '6136186875000000',
  gasLimit: '180684',
  gasUsed: '107889',
  gasPrice: '56875000000',
  inputData: '0xe9fad8ee',
  tokenTransfers: [
    {
      contract: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      decimals: 18,
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      type: 'ERC20',
      from: UNI_V2_FOX_STAKING_REWARDS_V3,
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      value: '531053586030903030',
    },
    {
      contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      decimals: 18,
      name: 'FOX',
      symbol: 'FOX',
      type: 'ERC20',
      from: UNI_V2_FOX_STAKING_REWARDS_V3,
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      value: '317669338073988',
    },
  ],
}

export default {
  tx: foxExit,
  txMempool: mempoolMock(foxExit),
}
