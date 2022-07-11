import { mempoolMock } from './mempoolMock'

const uniRemoveLiquidity = {
  txid: '0xfc193dfb8a3c792cf36491db174f3aba88b598e586b968e8bc55e9b5560d69df',
  blockHash: '0xc65a2f74e433afc34672280dad6e5c9932c643c005c8a392abc6d6c95082e04d',
  blockHeight: 12878436,
  timestamp: 1626987201,
  status: 1,
  from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
  to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  confirmations: 1934894,
  value: '0',
  fee: '4082585000000000',
  gasLimit: '246280',
  gasUsed: '125618',
  gasPrice: '32500000000',
  inputData:
    '0x02751cec000000000000000000000000c770eefad204b5180df6a14ee197d99d808ee52d0000000000000000000000000000000000000000000000000425421ce409fb6a000000000000000000000000000000000000000000000000d8df12139d3f78d80000000000000000000000000000000000000000000000000017c808102546a70000000000000000000000006bf198c2b5c8e48af4e876bc2173175b89b1da0c0000000000000000000000000000000000000000000000000000000060f9df80',
  tokenTransfers: [
    {
      contract: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      decimals: 18,
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      type: 'ERC20',
      from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      value: '298717642142382954'
    },
    {
      contract: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      decimals: 18,
      name: 'Uniswap V2',
      symbol: 'UNI-V2',
      type: 'ERC20',
      from: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      to: '0x0000000000000000000000000000000000000000',
      value: '298717642142382954'
    },
    {
      contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH',
      type: 'ERC20',
      from: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      value: '6761476182340434'
    },
    {
      contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      decimals: 18,
      name: 'FOX',
      symbol: 'FOX',
      type: 'ERC20',
      from: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      value: '15785079906515930982'
    },
    {
      contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      decimals: 18,
      name: 'FOX',
      symbol: 'FOX',
      type: 'ERC20',
      from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      value: '15785079906515930982'
    }
  ],
  internalTxs: [
    {
      from: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      value: '6761476182340434'
    },
    {
      from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
      value: '6761476182340434'
    }
  ]
}

export default {
  tx: uniRemoveLiquidity,
  txMempool: mempoolMock(uniRemoveLiquidity)
}
