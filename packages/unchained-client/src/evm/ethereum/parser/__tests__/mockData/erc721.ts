import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc721: Tx = {
  txid: '0x024226eaa45568bd0e6971782ed5a31a69316ea8855b2c7e622bc0978f2eebd3',
  blockHash: '0x81126f32927f9361483310722dd00921e325cddce0e20f846bc88a49f5ddae1b',
  blockHeight: 17188664,
  timestamp: 1683219827,
  status: 1,
  from: '0xa5d981BC0Bc57500ffEDb2674c597F14a3Cb68c1',
  to: '0x68d0F6d1d99Bb830E17fFaA8aDB5BbeD9D6EEc2E',
  confirmations: 112,
  value: '0',
  fee: '5974629016703985',
  gasLimit: '64647',
  gasUsed: '64647',
  gasPrice: '92419277255',
  inputData:
    '0x42842e0e000000000000000000000000a5d981bc0bc57500ffedb2674c597f14a3cb68c100000000000000000000000086c6b7f9d91d104e53f2be608549f0dc6ecabb5700000000000000000000000000000000000000000000000000000000000008cd',
  tokenTransfers: [
    {
      contract: '0x68d0F6d1d99Bb830E17fFaA8aDB5BbeD9D6EEc2E',
      decimals: 18,
      name: 'Diamond Exhibition',
      symbol: 'DIAMOND',
      type: 'ERC721',
      from: '0xa5d981BC0Bc57500ffEDb2674c597F14a3Cb68c1',
      to: '0x86c6B7f9D91D104e53F2Be608549F0Dc6ECABb57',
      value: '1',
      id: '2253',
    },
  ],
  internalTxs: [],
}

export default {
  tx: erc721,
  txMempool: mempoolMock(erc721),
}
