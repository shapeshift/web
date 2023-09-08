import type { Tx } from '../../../../../generated/bitcoincash'

const tx: Tx = {
  txid: '04731bc006aac37c8305ab074c920d839c0dfee9fb05033de728078464d426ce',
  blockHash: '00000000000000000597ec2f75cd7cad9e7a14c073c72b32feb8d6faa7c058ee',
  blockHeight: 751381,
  timestamp: 1659374897,
  confirmations: 1,
  value: '10436718',
  fee: '185',
  hex: '01000000011ab8102c773d941777badcb5b44f4a196e338bb23723a69846c8355eab09d3612f00000064413b2e6eec5c103451d51cbee26720128214b10712030fba50ad28adc20ef9f65dfa34a011e5626f138fc99b6d17ad9c6e6ed4e3f2cb3091b0081676299f6550f641210339afd5be7cc4bfe92ba3097721b29086a72e2fde17c2bd70b40fbf1619cc1d9bfeffffff016e409f00000000001976a91428b4e1bdbafef3518bd659cec48aaff0d32a8a1088ac14770b00',
  vin: [
    {
      txid: '61d309ab5e35c84698a62337b28b336e194a4fb4b5dcba7717943d772c10b81a',
      vout: '47',
      sequence: 4294967294,
      scriptSig: {
        hex: '413b2e6eec5c103451d51cbee26720128214b10712030fba50ad28adc20ef9f65dfa34a011e5626f138fc99b6d17ad9c6e6ed4e3f2cb3091b0081676299f6550f641210339afd5be7cc4bfe92ba3097721b29086a72e2fde17c2bd70b40fbf1619cc1d9b',
      },
      addresses: ['bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu'],
      value: '10436903',
    },
  ],
  vout: [
    {
      value: '10436718',
      n: 0,
      scriptPubKey: {
        hex: '76a91428b4e1bdbafef3518bd659cec48aaff0d32a8a1088ac',
      },
      addresses: ['bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs'],
    },
  ],
}
export default {
  tx,
  txMempool: { ...tx, blockHash: undefined, blockHeight: -1, confirmations: 0 } as Tx,
}
