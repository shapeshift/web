export default {
  tx: {
    txid: '0xcb4c224c9843289957c95519811225ab6ada773c9e1faafb30ace0193ff6e3f9',
    vin: [
      {
        n: 0,
        addresses: ['0x5bb96c35a68Cba037D0F261C67477416db137F03'],
        isAddress: true
      }
    ],
    vout: [
      {
        value: '0',
        n: 0,
        addresses: ['0xDef1C0ded9bec7F1a1670819833240f027b25EfF'],
        isAddress: true
      }
    ],
    blockHash: '0xe27ff22423ca0a1e9cc5cd12599d00f51cda7a706cbb475bba15ced85091931e',
    blockHeight: 12323213,
    confirmations: 20072,
    blockTime: 1619537079,
    value: '0',
    fees: '8308480000000000',
    tokenTransfers: [
      {
        type: 'ERC20',
        from: '0x5bb96c35a68Cba037D0F261C67477416db137F03',
        to: '0x7ce01885a13c652241aE02Ea7369Ee8D466802EB',
        token: '0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B',
        name: 'Tribe',
        symbol: 'TRIBE',
        decimals: 18,
        value: '1000000000000000000000'
      },
      {
        type: 'ERC20',
        from: '0x7ce01885a13c652241aE02Ea7369Ee8D466802EB',
        to: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
        token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        value: '541566754246167133'
      }
    ],
    ethereumSpecific: {
      status: 1,
      nonce: 609,
      gasLimit: 159001,
      gasUsed: 103856,
      gasPrice: '80000000000',
      data: '0xd9627aa4000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000770ca929ce9fd7500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c7283b66eb1eb5fb86327f08e1b5816b0720212b000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee869584cd0000000000000000000000007cba0eb7a94068324583be7771c5ecda25e4c4d1000000000000000000000000000000000000000000000081466fe92460882c76'
    }
  },
  internalTxs: [
    {
      blockNumber: '12323213',
      timeStamp: '1619537079',
      hash: '0xcb4c224c9843289957c95519811225ab6ada773c9e1faafb30ace0193ff6e3f9',
      from: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF', // normalized to checksum format
      to: '0x5bb96c35a68Cba037D0F261C67477416db137F03', // normalized to checksum format
      value: '541566754246167133',
      contractAddress: '',
      input: '',
      type: 'call',
      gas: '15532',
      gasUsed: '0',
      traceId: '0_4',
      isError: '0',
      errCode: ''
    }
  ]
}
