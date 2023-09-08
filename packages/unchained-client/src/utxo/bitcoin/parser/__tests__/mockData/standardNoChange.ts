import type { Tx } from '../../../../../generated/bitcoin'

const tx: Tx = {
  txid: 'b90e64d010d56f9a4ed4a81f56d497d32407a92ce23f0b6583a4ae2838ae2a0c',
  blockHash: '000000000000000000060c1f01e709357e0aca37d4a6940ce9cf67dfa6c6ff4f',
  blockHeight: 712285,
  timestamp: 1638477146,
  confirmations: 24927,
  value: '12983190',
  fee: '6528',
  hex: '0100000001a38b295d001b6a5550589d235c6b50538c4a5b05a6c47378a5a4f2e4a4892e7e220000006a47304402201ac1433fa6799183935ab64ce750143b5730aec46ed0653eb2f9ac426e1f7e970220206f5094b607cae1cc1f95e554ee9ea825c19592610b5993041ded92f488c8ee012103678191993126eafd3116a651a2e920d5ca1d3f6eb53399c8c6960c3b435ac607ffffffff01961bc600000000001976a914cc2a77c4114494f8b0f9a902f6860302da9eda0188ac00000000',
  vin: [
    {
      txid: '7e2e89a4e4f2a4a57873c4a6055b4a8c53506b5c239d5850556a1b005d298ba3',
      vout: '34',
      sequence: 4294967295,
      scriptSig: {
        hex: '47304402201ac1433fa6799183935ab64ce750143b5730aec46ed0653eb2f9ac426e1f7e970220206f5094b607cae1cc1f95e554ee9ea825c19592610b5993041ded92f488c8ee012103678191993126eafd3116a651a2e920d5ca1d3f6eb53399c8c6960c3b435ac607',
      },
      addresses: ['1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj'],
      value: '12989718',
    },
  ],
  vout: [
    {
      value: '12983190',
      n: 0,
      scriptPubKey: {
        hex: '76a914cc2a77c4114494f8b0f9a902f6860302da9eda0188ac',
      },
      addresses: ['1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7'],
    },
  ],
}
export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
