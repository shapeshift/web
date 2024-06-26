import type { Tx } from '../../../..'

const tx: Tx = {
  txid: '0x6f800e60876460c749e8a9e6dbccd4d166ffc8243a9a63c0c323327ab9764d81',
  blockHash: '0x34e3fdfac2e0780254ab3e1f10135bfd2097402c472862a00305b609d65cf4f5',
  blockHeight: 221510152,
  timestamp: 1718304113,
  status: 1,
  from: '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
  to: '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56',
  confirmations: 309455,
  value: '0',
  fee: '41698790000000',
  gasLimit: '195355',
  gasUsed: '159460',
  gasPrice: '261500000',
  inputData: '0x2e1a7d4d0000000000000000000000000000000000000000000000000000000000000000',
  tokenTransfers: [
    {
      contract: '0xf929de51D91C77E42f5090069E0AD7A09e513c73',
      decimals: 18,
      name: 'FOX',
      symbol: 'FOX',
      type: 'ERC20',
      from: '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56',
      to: '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
      value: '4364832128906250000',
    },
  ],
  internalTxs: [],
}

export default { tx }
