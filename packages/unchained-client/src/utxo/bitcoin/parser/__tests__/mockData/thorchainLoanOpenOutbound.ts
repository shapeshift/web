import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '98dcde74844ef79c7cd4facd067d697d1aca698fe62aac367bcf7e932d5dfd6c',
  blockHash: '00000000000000000003b6281d62777585f7f706e8a73a9852282a6c9579c633',
  blockHeight: 825524,
  timestamp: 1705094377,
  confirmations: 2777,
  value: '9376147769',
  fee: '19364',
  hex: '0100000000010171737662e4adcfa9c1159288b7f186453bccac89881c737fb39b33773ea03b760100000000ffffffff0397e51a0000000000160014c91eeba00fca6a33376a0b3514986225833b1dd9a2c3c12e0200000016001498f9b8fb6dfb17d21696a24f7312c7813436309a0000000000000000466a444f55543a383444343530373337374241453846374239323937454145333937333838353434353943384333373544313939344242394146333645343531323332433546350247304402204cbe0a6576e20ca3228857ea2f6b181c1abcd466e9932d124256f78c147d5d1302202c65a069fcadfe1565b67a2ae26925db1bc895f1ef868cc03e8fcc54df6d4c90012103a7ed7b223f362eff9a95e7d422bc0be888c8ddce3362ac216c2aa29f12c91bb700000000',
  vin: [
    {
      txid: '763ba03e77339bb37f731c8889accc3b4586f1b7889215c1a9cfade462767371',
      vout: '1',
      sequence: 4294967295,
      addresses: ['bc1qnrum37mdlvtay95k5f8hxyk8sy6rvvy60vc9gq'],
      value: '9376167133',
    },
  ],
  vout: [
    {
      value: '1762711',
      n: 0,
      scriptPubKey: {
        hex: '0014c91eeba00fca6a33376a0b3514986225833b1dd9',
      },
      addresses: ['bc1qey0whgq0ef4rxdm2pv63fxrzykpnk8weucpux5'],
    },
    {
      value: '9374385058',
      n: 1,
      scriptPubKey: {
        hex: '001498f9b8fb6dfb17d21696a24f7312c7813436309a',
      },
      addresses: ['bc1qnrum37mdlvtay95k5f8hxyk8sy6rvvy60vc9gq'],
    },
    {
      value: '0',
      n: 2,
      opReturn: 'OP_RETURN (OUT:84D4507377BAE8F7B9297EAE39738854459C8C375D1994BB9AF36E451232C5F5)',
      scriptPubKey: {
        hex: '6a444f55543a38344434353037333737424145384637423932393745414533393733383835343435394338433337354431393934424239414633364534353132333243354635',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1705089425965133034',
      height: '14245435',
      in: [
        {
          address: '0xc9991a2e36e848d8e7484258889f8d206e8f4bd6',
          coins: [
            {
              amount: '97362202',
              asset: 'ETH.ETH',
            },
          ],
          txID: '84D4507377BAE8F7B9297EAE39738854459C8C375D1994BB9AF36E451232C5F5',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '7649495',
          memo: 'loan+:BTC.BTC:bc1qey0whgq0ef4rxdm2pv63fxrzykpnk8weucpux5:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '46500',
              asset: 'BTC.BTC',
            },
          ],
          swapSlip: '2',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'bc1qey0whgq0ef4rxdm2pv63fxrzykpnk8weucpux5',
          coins: [
            {
              amount: '1762711',
              asset: 'BTC.BTC',
            },
          ],
          height: '14246158',
          txID: '98DCDE74844EF79C7CD4FACD067D697D1ACA698FE62AAC367BCF7E932D5DFD6C',
        },
      ],
      pools: ['ETH.ETH', 'THOR.ETH'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '142454359000000133',
    prevPageToken: '142454359000000133',
  },
}

export default { tx, actionsResponse }
