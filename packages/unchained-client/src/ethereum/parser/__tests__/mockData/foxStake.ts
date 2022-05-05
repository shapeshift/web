import { mempoolMock } from './mempoolMock'

const foxStake = {
  txid: '0x253585eae87ebbb6b81c0fa6c6fe3894fb8afb2fb8c7073f7c4b28915aebd2a7',
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
      addresses: ['0xDd80E21669A664Bce83E3AD9a0d74f8Dad5D9E72'],
      isAddress: true
    }
  ],
  blockHash: '0x265087ce9f2a67227637d2f9680bc2916c61c980a6097ca46be51e864c60b156',
  blockHeight: 12878348,
  confirmations: 2,
  blockTime: 1626986096,
  value: '0',
  fees: '4650509500000000',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: '0xDd80E21669A664Bce83E3AD9a0d74f8Dad5D9E72',
      token: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      decimals: 18,
      value: '99572547380794318'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 101,
    gasLimit: 128636,
    gasUsed: 102209,
    gasPrice: '45500000000',
    data: '0xa694fc3a0000000000000000000000000000000000000000000000000161c0b44c0353ce'
  }
}

export default {
  tx: foxStake,
  txMempool: mempoolMock(foxStake)
}
