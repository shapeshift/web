export default {
  tx: {
    txid: '0x387e3c00b1a4da78f45bf6672f967138edee98ac5718bebd271fda571628e9b0',
    vin: [
      {
        n: 0,
        addresses: ['0x55FB947880EE0660C90bC2055748aD70956FbE3c'],
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
    blockHash: '0x803962d06865a7f5cf8ca9ab5407ffeb8a0106c02e39faa23dc6451c0b94982b',
    blockHeight: 14686750,
    confirmations: 12838,
    blockTime: 1651337579,
    value: '0',
    fees: '4735850597827293',
    tokenTransfers: [
      {
        type: 'ERC20',
        from: '0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
        to: '0x55FB947880EE0660C90bC2055748aD70956FbE3c',
        token: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        name: 'FOX',
        symbol: 'FOX',
        decimals: 18,
        value: '1200000000000000000000'
      },
      {
        type: 'ERC20',
        from: '0xa542D7A3B031EabB5133993bA9a31631669F19B0',
        to: '0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
        token: '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3',
        name: 'FOX Yieldy',
        symbol: 'FOXy',
        decimals: 18,
        value: '1201078731873535361976'
      }
    ],
    ethereumSpecific: {
      status: 1,
      nonce: 24,
      gasLimit: 116131,
      gasUsed: 101731,
      gasPrice: '46552679103',
      data: '0x516c49d900000000000000000000000055fb947880ee0660c90bc2055748ad70956fbe3c'
    }
  }
}
