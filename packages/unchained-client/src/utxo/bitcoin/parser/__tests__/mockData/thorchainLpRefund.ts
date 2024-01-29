import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '8877bc0b81bd8cdd4dc5fbf2d654c873669f88de622a8bf545c8ade491d1828c',
  blockHash: '000000000000000000005882bda71b3a43073227d5637b24ecc9c9e013e6cbf6',
  blockHeight: 823072,
  timestamp: 1703632402,
  confirmations: 2279,
  value: '36088685264',
  fee: '158400',
  hex: '0100000000010a8952dbf883e77719ae92ce3cf275f4d4bb2664ae287d634f53f18eb992320a510000000000ffffffff894334d10f363cfcbb8b173d8bd1436a6fb7d72710bbafcb429d13b9da5155800000000000ffffffff687bc3bd0e72a82509793f0808343d64d5e043d79abd166e412927b741d382b40000000000ffffffff9ab19c9dc8789b6a81541d3a6edd7ef54c009335ecca6b5dafbf571add59e6010000000000ffffffff5f6e6ba996b50cbf1d0e88fb2f12af897213c02b6e73655fd3c92e26e2cbf4c30000000000ffffffff3d26fc70a35432f3a292975e4125cadf70b36227b0c8a3e101f423dfdd15bbc80000000000ffffffffa24913e1c4b74210965257ccd6fe10b18821f903bb609f8981f82530d2f5b61d0000000000ffffffff3a10bd1f9f3e85f34ee570ef33ea38797cf1ecae473be3e01b55408f580d64420000000000ffffffff6afcc217cc6391bc6d75f9c5a3fb787cc28f6f5aed736eb892a373273e1b7a8b0000000000ffffffffe0697a3fe7629e43c675902ed8a09186f8db498c4e96f40d56e812224a3d92b10000000000ffffffff039746110000000000160014755ef618d3447467d1403a1775b371e4a7fa1845395cfc660800000016001427fce96d5f6a72244e56563c7eb41fb79ac5ecf00000000000000000496a47524546554e443a4232353434364531384631423341384430333730384541423136333643344233354532313841463035424533464438413831314433393935334342463930394102483045022100e68c11313a4b894b1dbaecb32826634a95ea7bbc02310080a28ecf0593c1189f02204214c84fc7236eaddb230abeb1a70cc83e4ea6fed22256b1cef69db9112e30d60121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f02483045022100dfcdc639989602999677b3553404f560f2c14ffd79854bce214c29bbd6b2e29f02201778af61ace62985aae2f6d0d71ef25955bed51116b9833bf2745366ebd02f6d0121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f02483045022100cfcb55f5829b2b18be165909d789fdc7d1b74bc6a2ca54aa5110aac5d94a037c022070bb7a5aff3060569bca51906eeca5e3075d41c8c4d38d7623eb2e7dee18be910121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f02473044022070a2a6d4169154c7feb82308824fc4c3dbb24fe0150ddea4d063f3d54ef9a4ff02206ffa1603eb45038095a3e121c8be9b09d587a304bc93a2b9804b86d574f405b70121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f02483045022100f6bdb448aeab6f13c51e9a43da4ea079e834dc043c25c1f111cce43c4d58369d022075cb3a28e3668d5956d5e97477e0b90c6acf4dcd8019222983c836ed478b97df0121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f024730440220575315951dab4bdc1b9559c5c364c33fe0442cd03699813524c6bba6072d255002202c41b65ff39a879afa147598e713adaaca25895e13734073e9654230df02e8ab0121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f02483045022100b4740550d271a69c726e3a7102fcfa2f89fda4030f1e0aa0003e4e4cf642af78022058af5d6fab770e6df923ca9566e67b39c27891239fcb4b5c746dd15f732ac88f0121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f02483045022100fc37665650767fb4e6011330ce14cb504f00376c3f982798f28992daf57dc4e50220731b5cc85cec5fc9a9b7cc47668f13921343ddfba67fa1bb046d658f07e228f40121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f0247304402201dc094581fdec3401f7b1fa46b2b1e87e23c42333bb8f46205e830c74fc7128a022078cdfd8fa6b9c9e98febbbb82ebcbda45a123503652f1a0132a1b1f75712037a0121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f0247304402206acab88779e4dcc919e0a42ca08be0d4eff90e09f6d1b58873927d759903033502205bbc978d353031d50303dca013788f7a76c5c346caf7afffb27acec80617e1390121027b7c1a30b26b2a107934ba542bec15e28efa52a05541515966828181c55f0c1f00000000',
  vin: [
    {
      txid: '510a3292b98ef1534f637d28ae6426bbd4f475f23cce92ae1977e783f8db5289',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '29915400',
    },
    {
      txid: '805551dab9139d42cbafbb1027d7b76f6a43d18b3d178bbbfc3c360fd1344389',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '3529501',
    },
    {
      txid: 'b482d341b72729416e16bd9ad743e0d5643d3408083f790925a8720ebdc37b68',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '36021545481',
    },
    {
      txid: '01e659dd1a57bfaf5d6bcaec3593004cf57edd6e3a1d54816a9b78c89d9cb19a',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '184371',
    },
    {
      txid: 'c3f4cbe2262ec9d35f65736e2bc0137289af122ffb880e1dbf0cb596a96b6e5f',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '1100507',
    },
    {
      txid: 'c8bb15dddf23f401e1a3c8b02762b370dfca25415e9792a2f33254a370fc263d',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '650000',
    },
    {
      txid: '1db6f5d23025f881899f60bb03f92188b110fed6cc5752961042b7c4e11349a2',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '640000',
    },
    {
      txid: '42640d588f40551be0e33b47aeecf17c7938ea33ef70e54ef3853e9f1fbd103a',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '300000',
    },
    {
      txid: '8b7a1b3e2773a392b86e73ed5a6f8fc27c78fba3c5f9756dbc9163cc17c2fc6a',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '29915400',
    },
    {
      txid: 'b1923d4a2212e8560df4964e8c49dbf88691a0d82e9075c6439e62e73f7a69e0',
      sequence: 4294967295,
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
      value: '1063004',
    },
  ],
  vout: [
    {
      value: '1132183',
      n: 0,
      scriptPubKey: {
        hex: '0014755ef618d3447467d1403a1775b371e4a7fa1845',
      },
      addresses: ['bc1qw400vxxng36x052q8gthtvm3ujnl5xz957p2ma'],
    },
    {
      value: '36087553081',
      n: 1,
      scriptPubKey: {
        hex: '001427fce96d5f6a72244e56563c7eb41fb79ac5ecf0',
      },
      addresses: ['bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q'],
    },
    {
      value: '0',
      n: 2,
      opReturn:
        'OP_RETURN (REFUND:B25446E18F1B3A8D03708EAB1636C4B35E218AF05BE3FD8A811D39953CBF909A)',
      scriptPubKey: {
        hex: '6a47524546554e443a42323534343645313846314233413844303337303845414231363336433442333545323138414630354245334644384138313144333939353343424639303941',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1703631569986450183',
      height: '14016397',
      in: [
        {
          address: 'bc1qw400vxxng36x052q8gthtvm3ujnl5xz957p2ma',
          coins: [
            {
              amount: '1290583',
              asset: 'BTC.BTC',
            },
          ],
          txID: 'B25446E18F1B3A8D03708EAB1636C4B35E218AF05BE3FD8A811D39953CBF909A',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 't',
          affiliateFee: '0',
          memo: '+:BTC.BTC:thor1qt3zazyedurs4qjsrju69kdzhnvy9qqs2z64dn:t:0',
          networkFees: [
            {
              amount: '198000',
              asset: 'BTC.BTC',
            },
          ],
          reason:
            'memo paired address must be non-empty and together with origin address match the liquidity provider record',
        },
      },
      out: [
        {
          address: 'bc1qw400vxxng36x052q8gthtvm3ujnl5xz957p2ma',
          coins: [
            {
              amount: '1132183',
              asset: 'BTC.BTC',
            },
          ],
          height: '14016419',
          txID: '8877BC0B81BD8CDD4DC5FBF2D654C873669F88DE622A8BF545C8ADE491D1828C',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '140163971000100011',
    prevPageToken: '140163971000100011',
  },
}

export default { tx, actionsResponse }
