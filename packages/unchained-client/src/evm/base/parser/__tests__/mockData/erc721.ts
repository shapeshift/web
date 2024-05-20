import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc721: Tx = {
  txid: '0x273ec53a6a8418fc2cdc8dc45028417e959325734bdbf2404cb60ceb9b05cdf9',
  blockHash: '0xf6277fea44da8d3858192328548aeccc9008830e8d6e70c2debfa7ac66181ac0',
  blockHeight: 14553165,
  timestamp: 1715895677,
  status: 1,
  from: '0x4325775d28154FE505169cD1b680aF5c0C589cA8',
  to: '0xBE7ad8e7352C0aF6f72a8b1dB3be08f2dEAf4B4C',
  confirmations: 53,
  value: '0',
  fee: '11417223915522',
  gasLimit: '169887',
  gasUsed: '128496',
  gasPrice: '88766782',
  inputData:
    '0x42842e0e0000000000000000000000004325775d28154fe505169cd1b680af5c0c589ca8000000000000000000000000059b8628b3b533b31bd62e67da7168c2b4c2a25f0000000000000000000000000000000000000000000000000000000000000004360c6ebe',
  tokenTransfers: [
    {
      contract: '0xBE7ad8e7352C0aF6f72a8b1dB3be08f2dEAf4B4C',
      decimals: 18,
      name: 'Opepen Paint Editions',
      symbol: 'OPE',
      type: 'ERC721',
      from: '0x4325775d28154FE505169cD1b680aF5c0C589cA8',
      to: '0x059B8628B3b533b31bD62E67DA7168C2b4C2A25F',
      value: '1',
      id: '4',
    },
  ],
  internalTxs: [],
}

export default {
  tx: erc721,
  txMempool: mempoolMock(erc721),
}
