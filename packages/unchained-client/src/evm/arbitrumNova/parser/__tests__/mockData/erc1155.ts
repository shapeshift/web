import type { Tx } from '../../../../../evm'
import { mempoolMock } from './mempoolMock'

const erc1155: Tx = {
  txid: '0xc76c9eba4faa04438d43edaf81004ca14bfed36d7e1c26171dd53fcb52e938ce',
  blockHash: '0xc2fb1d46fa6340525895f81907f4379ac8f18c53c1577ba3f398c72de5ff7ed7',
  blockHeight: 27648405,
  timestamp: 1698952055,
  status: 1,
  from: '0x981eC398555e4683b89dB57C311D787E0a3a80E0',
  to: '0x3C5D88Ba90e35Bb772A5c66d36613F6801b56428',
  confirmations: 1210,
  value: '0',
  fee: '118323600000000',
  gasLimit: '83027',
  gasUsed: '78360',
  gasPrice: '1510000000',
  inputData:
    '0xaaf0d1ad000000000000000000000000b3d2aeeb22c927bfc29cbd6885134a4c3d76a7050000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000019c',
  tokenTransfers: [
    {
      contract: '0x3C5D88Ba90e35Bb772A5c66d36613F6801b56428',
      decimals: 18,
      name: '',
      symbol: '',
      type: 'ERC1155',
      from: '0x0000000000000000000000000000000000000000',
      to: '0xB3d2AeEB22c927Bfc29Cbd6885134a4c3D76A705',
      value: '20',
      id: '1',
    },
  ],
  internalTxs: [],
}

export default {
  tx: erc1155,
  txMempool: mempoolMock(erc1155),
}
