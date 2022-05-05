const internalTxs = [
  {
    blockNumber: '14616861',
    timeStamp: '1652975202',
    hash: '0x59ad10aae5c99b1d39df686208446d23b286ccd6bbc6bcd1f873b0c973cda840',
    from: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    to: '0xa6F15FB2cc5dC96c2EBA18c101AD3fAD27F74839',
    value: '100000000000000000',
    contractAddress: '',
    input: '',
    type: 'call',
    gas: '2300',
    gasUsed: '0',
    traceId: '0',
    isError: '0',
    errCode: ''
  }
]

const tx = {
  txid: '0x59ad10aae5c99b1d39df686208446d23b286ccd6bbc6bcd1f873b0c973cda840',
  vin: [
    {
      n: 0,
      addresses: ['0xa6F15FB2cc5dC96c2EBA18c101AD3fAD27F74839'],
      isAddress: true
    }
  ],
  vout: [
    {
      value: '0',
      n: 0,
      addresses: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
      isAddress: true
    }
  ],
  blockHash: '0x89258d7042c4aab8fdc607802fe2ab1e1eca3592234d310c1f37adf88f446359',
  blockHeight: 14616861,
  confirmations: 6778,
  blockTime: 1652975202,
  value: '0',
  fees: '1482223000000000',
  ethereumSpecific: {
    status: 1,
    nonce: 2,
    gasLimit: 38175,
    gasUsed: 30404,
    gasPrice: '49000000000',
    data: '0x2e1a7d4d000000000000000000000000000000000000000000000000016345785d8a0000'
  }
}

export default {
  tx,
  internalTxs
}
