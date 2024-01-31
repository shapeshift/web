import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: 'bf0c67414d6842ce3f24af1114ad2afb4afdc8f7fab9ec2dc2feec52a1b8e65d',
  blockHash: '00000000000000000003a3927282def3cb9333d27a3e57fb796b7b98f1051cb1',
  blockHeight: 825042,
  timestamp: 1704828477,
  confirmations: 6,
  value: '37146338589',
  fee: '18800',
  hex: '010000000001011ec3cc7f06f7854a6c0bf705a91ac3a4da602c1ae5c13f006d6d684599899c860100000000ffffffff0335fb7601000000001600145a20b5b70488b5ebe5188ebe52e50ddc74cebf74e829a1a408000000160014bfb126731142d711d7a9dbc4065d830d92e7f6e60000000000000000466a444f55543a423546453446324433313044333241444433443730433145383036453232343934334130384537334143383932383741423337344236353636433436303544380247304402201e4f9b61098ff861b3fa9f17ee23e9ee0740b93ef537b97bdd59c21f11fa542b02202bbef13d05c652a5c0e43c155752126dc8733553cd648a9bc270fe60975dd37c012102e04413afe986a11b20749ed3962058e1c9d8df9816ef399a22f57ab36801055f00000000',
  vin: [
    {
      txid: '869c899945686d6d003fc1e51a2c60daa4c31aa905f70b6c4a85f7067fccc31e',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu'],
      value: '37146357389',
    },
  ],
  vout: [
    {
      value: '24574773',
      n: 0,
      scriptPubKey: {
        hex: '00145a20b5b70488b5ebe5188ebe52e50ddc74cebf74',
      },
      addresses: ['bc1qtgsttdcy3z67hegc36l99egdm36va0m5r0gece'],
    },
    {
      value: '37121763816',
      n: 1,
      scriptPubKey: {
        hex: '0014bfb126731142d711d7a9dbc4065d830d92e7f6e6',
      },
      addresses: ['bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu'],
    },
    {
      value: '0',
      n: 2,
      opReturn: 'OP_RETURN (OUT:B5FE4F2D310D32ADD3D70C1E806E224943A08E73AC89287AB374B6566C4605D8)',
      scriptPubKey: {
        hex: '6a444f55543a42354645344632443331304433324144443344373043314538303645323234393433413038453733414338393238374142333734423635363643343630354438',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704828114457766702',
      height: '14204933',
      in: [
        {
          address: 'thor1x0uv04mglg439a8vw8q4mn83jm5s3uuj0mzsy9',
          coins: [
            {
              amount: '238200000000',
              asset: 'THOR.RUNE',
            },
          ],
          txID: 'B5FE4F2D310D32ADD3D70C1E806E224943A08E73AC89287AB374B6566C4605D8',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '42877209',
          memo: 'SWAP:BTC.BTC:bc1qtgsttdcy3z67hegc36l99egdm36va0m5r0gece:24000000',
          networkFees: [
            {
              amount: '58500',
              asset: 'BTC.BTC',
            },
          ],
          swapSlip: '2',
          swapTarget: '24000000',
        },
      },
      out: [
        {
          address: 'bc1qtgsttdcy3z67hegc36l99egdm36va0m5r0gece',
          coins: [
            {
              amount: '24574773',
              asset: 'BTC.BTC',
            },
          ],
          height: '14204982',
          txID: 'BF0C67414D6842CE3F24AF1114AD2AFB4AFDC8F7FAB9EC2DC2FEEC52A1B8E65D',
        },
      ],
      pools: ['BTC.BTC'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142049339000000035',
    prevPageToken: '142049339000000035',
  },
}

export default { tx, actionsResponse }
