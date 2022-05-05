export default {
  tx: {
    txid: '0x61f0b56d73a7fe3435d231a64cf227d47703b9f9bdb85b4fcfd3d3c9f88c119b',
    vin: [
      {
        n: 0,
        addresses: ['0xCBa38513451bCE398A87F9950a154034Cad59cE9'],
        isAddress: true
      }
    ],
    vout: [
      {
        value: '0',
        n: 0,
        addresses: ['0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b'],
        isAddress: true
      }
    ],
    blockHash: '0x232976f0bbc55c31137253e13af570a9204cd18dfbf4df538637a2e2c7f8a1a0',
    blockHeight: 14695003,
    confirmations: 4491,
    blockTime: 1651449499,
    value: '0',
    fees: '8343629232016788',
    tokenTransfers: [
      {
        type: 'ERC20',
        from: '0xCBa38513451bCE398A87F9950a154034Cad59cE9',
        to: '0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
        token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        name: 'FOX',
        symbol: 'FOX',
        decimals: 18,
        value: '109548875260073394762'
      },
      {
        type: 'ERC20',
        from: '0x0000000000000000000000000000000000000000',
        to: '0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
        token: '0x808D3E6b23516967ceAE4f17a5F9038383ED5311',
        name: 'TokemaktFOX',
        symbol: 'tFOX',
        decimals: 18,
        value: '109548875260073394762'
      },
      {
        type: 'ERC20',
        from: '0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
        to: '0x808D3E6b23516967ceAE4f17a5F9038383ED5311',
        token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        name: 'FOX',
        symbol: 'FOX',
        decimals: 18,
        value: '109548875260073394762'
      },
      {
        type: 'ERC20',
        from: '0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
        to: '0xCBa38513451bCE398A87F9950a154034Cad59cE9',
        token: '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3',
        name: 'FOX Yieldy',
        symbol: 'FOXy',
        decimals: 18,
        value: '109548875260073394762'
      }
    ],
    ethereumSpecific: {
      status: 1,
      nonce: 13,
      gasLimit: 150478,
      gasUsed: 147678,
      gasPrice: '56498796246',
      data: '0x7acb7757000000000000000000000000000000000000000000000005f04bc9a25c40c24a000000000000000000000000cba38513451bce398a87f9950a154034cad59ce9'
    }
  }
}
