import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'a1174a690a6e9cc570e4e4a76f8be49d82fa2353cfd686c1b6b210d58d0e3cc7',
  blockHash: '00000000000000000002e0780dc578b85b9d8aa76db00ccdfca8629b353dfb43',
  blockHeight: 825055,
  timestamp: 1704834951,
  confirmations: 2,
  value: '677936',
  fee: '11484',
  hex: '01000000000101b02c9e0f5c77e0ee1817c1fa8f840a6f7a89aa828d2fa1287fd2469aaaa9aa260100000000ffffffff03ac2d030000000000160014407afe0a21bd5fed4aa98da464084dd2e8a29e0d842a0700000000001600147f7b24ee432f5eff0badde9ffe41bf57c0bc9ba30000000000000000476a453d3a4554482e555344542d4543373a3078363035376432443966303765303646413038333661313761346534463030343464384630323931323a302f312f303a74693a37300247304402202ea6a37f58f32329933144aa8af636e7893845aba6923f7346b11e18eb08dd460220273b2571f1e7df8bee2b158ef063c9a4db53767a3093842c7ccc3dc44a13d51d012103e9154423011550766d1e1bf868c045613e166020556dabdb9319b149b407cc9800000000',
  vin: [
    {
      txid: '26aaa9aa9a46d27f28a12f8d82aa897a6f0a848ffac11718eee0775c0f9e2cb0',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1q0aajfmjr9a007zadm60lusdl2lqtexars8aul3'],
      value: '689420',
    },
  ],
  vout: [
    {
      value: '208300',
      n: 0,
      scriptPubKey: {
        hex: '0014407afe0a21bd5fed4aa98da464084dd2e8a29e0d',
      },
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
    },
    {
      value: '469636',
      n: 1,
      scriptPubKey: {
        hex: '00147f7b24ee432f5eff0badde9ffe41bf57c0bc9ba3',
      },
      addresses: ['bc1q0aajfmjr9a007zadm60lusdl2lqtexars8aul3'],
    },
    {
      value: '0',
      n: 2,
      opReturn: 'OP_RETURN (=:ETH.USDT-EC7:0x6057d2D9f07e06FA0836a17a4e4F0044d8F02912:0/1/0:ti:70)',
      scriptPubKey: {
        hex: '6a453d3a4554482e555344542d4543373a3078363035376432443966303765303646413038333661313761346534463030343464384630323931323a302f312f303a74693a3730',
      },
    },
  ],
}

export default { tx }
