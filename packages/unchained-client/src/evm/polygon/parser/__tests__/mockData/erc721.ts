import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc721: Tx = {
  txid: '0x9fc576302514d67469c6d8ffb172bea85583af2f8200649156659981f073d311',
  blockHash: '0x8782d343fff7ed63460c8f60df8ac8af53b55641ab33ed542108e4bc074ec73a',
  blockHeight: 42545575,
  timestamp: 1683747068,
  status: 1,
  from: '0x841c64caDA7837e48463Cb022d93f33D1f63356c',
  to: '0xA4B37bE40F7b231Ee9574c4b16b7DDb7EAcDC99B',
  confirmations: 37,
  value: '0',
  fee: '12631422480372220',
  gasLimit: '60677',
  gasUsed: '57484',
  gasPrice: '219738057205',
  inputData:
    '0x23b872dd000000000000000000000000841c64cada7837e48463cb022d93f33d1f63356c000000000000000000000000d8d534c68b52a1ae7af3bb0bc6c51e97e9007f0f000000000000000000000000000000000000000000000000000000000004698f',
  tokenTransfers: [
    {
      contract: '0xA4B37bE40F7b231Ee9574c4b16b7DDb7EAcDC99B',
      decimals: 18,
      name: 'Objekt',
      symbol: 'OBJEKT',
      type: 'ERC721',
      from: '0x841c64caDA7837e48463Cb022d93f33D1f63356c',
      to: '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F',
      value: '1',
      id: '289167',
    },
  ],
  internalTxs: [],
}

export default {
  tx: erc721,
  txMempool: mempoolMock(erc721),
}
