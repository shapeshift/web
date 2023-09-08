import type { Tx } from '../../../../../generated/bitcoincash'

const tx: Tx = {
  txid: '01b4faebc7c0eacc93acc1479a491b4e2889b37ef1c04e55270fc4ffbb1e3f7b',
  blockHash: '00000000000000000597ec2f75cd7cad9e7a14c073c72b32feb8d6faa7c058ee',
  blockHeight: 751381,
  timestamp: 1659374897,
  confirmations: 1,
  value: '8758349',
  fee: '220',
  hex: '02000000011ac001cf5a530dea11d10c52a3e8246a307c9bf6ff0d4aeff724786cd7fc3239010000006441ca7dcfdb94873283b4948bf919dd90974a99826ec744ea691eb2166b881f07dda1e3df8f0aa938fc43e7db3566ab63a5614a09ee8be0e1af7728dd41c0314f5a412103bcede3927a1ebf04172a51dc598410709460725171c300b84f1fa8d0143808330000000002e1160000000000001976a914b7ee9a2a98adbfa125f0160a31bb0b1a6a99929588ac6c8d8500000000001976a91489208ce50752ee65647972d40cc27c261e806d7b88ac00000000',
  vin: [
    {
      txid: '3932fcd76c7824f7ef4a0dfff69b7c306a24e8a3520cd111ea0d535acf01c01a',
      vout: '1',
      scriptSig: {
        hex: '41ca7dcfdb94873283b4948bf919dd90974a99826ec744ea691eb2166b881f07dda1e3df8f0aa938fc43e7db3566ab63a5614a09ee8be0e1af7728dd41c0314f5a412103bcede3927a1ebf04172a51dc598410709460725171c300b84f1fa8d014380833',
      },
      addresses: ['bitcoincash:qzyjpr89qafwuety09edgrxz0snpaqrd0vvymq6ec0'],
      value: '8758569',
    },
  ],
  vout: [
    {
      value: '5857',
      n: 0,
      scriptPubKey: {
        hex: '76a914b7ee9a2a98adbfa125f0160a31bb0b1a6a99929588ac',
      },
      addresses: ['bitcoincash:qzm7ax32nzkmlgf97qtq5vdmpvdx4xvjj5dlmputzn'],
    },
    {
      value: '8752492',
      n: 1,
      scriptPubKey: {
        hex: '76a91489208ce50752ee65647972d40cc27c261e806d7b88ac',
      },
      addresses: ['bitcoincash:qzyjpr89qafwuety09edgrxz0snpaqrd0vvymq6ec0'],
    },
  ],
}

export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
