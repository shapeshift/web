import type { Tx } from '../../../index'
import { mempoolMock } from './mempoolMock'

const erc721: Tx = {
  txid: '0xce16ae93e9b4c4482eff5dd6b906f84e87892decf6ca3d95f01efd6c68e702f4',
  blockHash: '0x11348b2674688663dd81c88c4b6f69ccf39ea85948676d477692f773fcddf90e',
  blockHeight: 97274550,
  timestamp: 1683736519,
  status: 1,
  from: '0xd861415F6703ab50Ce101C7E6f6A80ada1FC2B1c',
  to: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  confirmations: 17430,
  value: '0',
  fee: '893340935236256',
  gasLimit: '243448',
  gasUsed: '187381',
  gasPrice: '1000000',
  inputData:
    '0x42842e0e000000000000000000000000d861415f6703ab50ce101c7e6f6a80ada1fc2b1c0000000000000000000000005411894842e610c4d0f6ed4c232da689400f94a1000000000000000000000000000000000000000000000000000000000005b6d1',
  tokenTransfers: [
    {
      contract: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      decimals: 18,
      name: 'Uniswap V3 Positions NFT-V1',
      symbol: 'UNI-V3-POS',
      type: 'ERC721',
      from: '0xd861415F6703ab50Ce101C7E6f6A80ada1FC2B1c',
      to: '0x5411894842e610C4D0F6Ed4C232DA689400f94A1',
      value: '1',
      id: '374481',
    },
  ],
  internalTxs: [],
}

export default {
  tx: erc721,
  txMempool: mempoolMock(erc721),
}
