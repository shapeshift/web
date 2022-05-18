import { UNI_V2_FOX_STAKING_REWARDS_V3 } from '../../constants'
import { mempoolMock } from './mempoolMock'

const foxExit = {
  txid: '0x1c676dd29be457b091e1ecb6578b6614d3f084df610876dfd196e6125fc3f6d6',
  vin: [
    {
      n: 0,
      addresses: ['0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '0',
      n: 0,
      addresses: [UNI_V2_FOX_STAKING_REWARDS_V3],
      isAddress: true
    }
  ],
  blockHash: '0xe0aec5e08be120be859880700b5d5a4927e65f35611b3d220bc7629677707137',
  blockHeight: 12878219,
  confirmations: 4,
  blockTime: 1626984360,
  value: '0',
  fees: '6136186875000000',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: UNI_V2_FOX_STAKING_REWARDS_V3,
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      token: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      decimals: 18,
      value: '531053586030903030'
    },
    {
      type: 'ERC20',
      from: UNI_V2_FOX_STAKING_REWARDS_V3,
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      name: 'FOX',
      symbol: 'FOX',
      decimals: 18,
      value: '317669338073988'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 97,
    gasLimit: 180684,
    gasUsed: 107889,
    gasPrice: '56875000000',
    data: '0xe9fad8ee'
  }
}

export default {
  tx: foxExit,
  txMempool: mempoolMock(foxExit)
}
