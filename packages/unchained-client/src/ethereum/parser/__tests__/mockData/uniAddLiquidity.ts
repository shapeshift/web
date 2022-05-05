import { mempoolMock } from './mempoolMock'

const uniAddLiquidity = {
  txid: '0x209a3be2278e7de0e9cbb380abd9321eb07c42443b984e2d988babc0e3ab8fa3',
  vin: [
    {
      n: 0,
      addresses: ['0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '42673718176645189',
      n: 0,
      addresses: ['0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'],
      isAddress: true
    }
  ],
  blockHash: '0xab73538d14c799602026455a19be26aa9eddaa0f59da00188b94719978edeca2',
  blockHeight: 12878550,
  confirmations: 2,
  blockTime: 1626988783,
  value: '42673718176645189',
  fees: '26926494400000000',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      name: 'FOX',
      symbol: 'FOX',
      decimals: 18,
      value: '100000000000000000000'
    },
    {
      type: 'ERC20',
      from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      value: '42673718176645189'
    },
    {
      type: 'ERC20',
      from: '0x0000000000000000000000000000000000000000',
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      token: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      decimals: 18,
      value: '1888842410762840601'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 103,
    gasLimit: 205867,
    gasUsed: 145864,
    gasPrice: '184600000000',
    data: '0xf305d719000000000000000000000000c770eefad204b5180df6a14ee197d99d808ee52d0000000000000000000000000000000000000000000000056bc75e2d631000000000000000000000000000000000000000000000000000055de6a779bbac000000000000000000000000000000000000000000000000000000961767c7084d110000000000000000000000006bf198c2b5c8e48af4e876bc2173175b89b1da0c0000000000000000000000000000000000000000000000000000000060f9e5a1'
  }
}

export default {
  tx: uniAddLiquidity,
  txMempool: mempoolMock(uniAddLiquidity)
}
