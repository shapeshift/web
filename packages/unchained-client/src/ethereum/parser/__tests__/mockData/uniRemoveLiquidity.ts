import { mempoolMock } from './mempoolMock'

const internalTxs = [
  {
    blockNumber: '12878436',
    timeStamp: '1626987201',
    hash: '0xfc193dfb8a3c792cf36491db174f3aba88b598e586b968e8bc55e9b5560d69df',
    from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
    value: '6761476182340434',
    contractAddress: '',
    input: '',
    type: 'call',
    gas: '42706',
    gasUsed: '0',
    traceId: '4',
    isError: '0',
    errCode: ''
  }
]

const uniRemoveLiquidity = {
  txid: '0xfc193dfb8a3c792cf36491db174f3aba88b598e586b968e8bc55e9b5560d69df',
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
      addresses: ['0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'],
      isAddress: true
    }
  ],
  blockHash: '0xc65a2f74e433afc34672280dad6e5c9932c643c005c8a392abc6d6c95082e04d',
  blockHeight: 12878436,
  confirmations: 7,
  blockTime: 1626987201,
  value: '0',
  fees: '4082585000000000',
  tokenTransfers: [
    {
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      token: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      decimals: 18,
      value: '298717642142382954'
    },
    {
      type: 'ERC20',
      from: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      to: '0x0000000000000000000000000000000000000000',
      token: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      decimals: 18,
      value: '298717642142382954'
    },
    {
      type: 'ERC20',
      from: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      value: '6761476182340434'
    },
    {
      type: 'ERC20',
      from: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      name: 'FOX',
      symbol: 'FOX',
      decimals: 18,
      value: '15785079906515930982'
    },
    {
      type: 'ERC20',
      from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      name: 'FOX',
      symbol: 'FOX',
      decimals: 18,
      value: '15785079906515930982'
    }
  ],
  ethereumSpecific: {
    status: 1,
    nonce: 102,
    gasLimit: 246280,
    gasUsed: 125618,
    gasPrice: '32500000000',
    data: '0x02751cec000000000000000000000000c770eefad204b5180df6a14ee197d99d808ee52d0000000000000000000000000000000000000000000000000425421ce409fb6a000000000000000000000000000000000000000000000000d8df12139d3f78d80000000000000000000000000000000000000000000000000017c808102546a70000000000000000000000006bf198c2b5c8e48af4e876bc2173175b89b1da0c0000000000000000000000000000000000000000000000000000000060f9df80'
  }
}

export default {
  tx: uniRemoveLiquidity,
  txMempool: mempoolMock(uniRemoveLiquidity),
  internalTxs
}
