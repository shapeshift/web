import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0x87a3dd7d4f850e63ec05b9e4de1a14e644ce41f44017bfce2bf7b5660130f994',
  blockHash: '0x9a99387e9d917e3c4ae0526a14718fb5b11840143f315f3ae2aae2adfba504d4',
  blockHeight: 18790559,
  timestamp: 1702631687,
  status: 1,
  from: '0x5FBAe6Ac253d18bED896C27490804F51eEDc8039',
  to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
  confirmations: 338785,
  value: '20948330710000000000',
  fee: '3986000000000000',
  gasLimit: '84000',
  gasUsed: '39860',
  gasPrice: '100000000000',
  inputData:
    '0x574da71700000000000000000000000093ca9d11740794b5e93f65a9ab63c930b1db1f95000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000122b76bcaaef4dc00000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000444f55543a3535434446453346334136444332454641454539343332434437444542444131343330393935354243444344414444453645443936333738423132393731383500000000000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
      to: '0x93Ca9d11740794b5E93f65a9AB63C930B1DB1f95',
      value: '20948330710000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1702627177354761017',
      height: '13858860',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461544',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146128176',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627171332987214',
      height: '13858859',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146233548',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627165350303431',
      height: '13858858',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146335995',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627159178024333',
      height: '13858857',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '145883088',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627153161176468',
      height: '13858856',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '145988279',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627146926304184',
      height: '13858855',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146093575',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627140584949093',
      height: '13858854',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146201613',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627133898394426',
      height: '13858853',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146307099',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627127626623885',
      height: '13858852',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146415737',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627121612667018',
      height: '13858851',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146514122',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627110915923296',
      height: '13858850',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146068255',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627104804172695',
      height: '13858849',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146173635',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1702627098592231802',
      height: '13858848',
      in: [
        {
          address: 'bc1qnzv57e6grk9p8v6esmq8kzqu052zysd9j84k00',
          coins: [
            {
              amount: '38461538',
              asset: 'BTC.BTC',
            },
          ],
          txID: '55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: '',
          affiliateFee: '0',
          isStreamingSwap: false,
          liquidityFee: '146292765',
          memo: 'loan+:ETH.ETH:0x93ca9d11740794b5e93f65a9ab63c930b1db1f95:0:thor160yye65pf9rzwrgqmtgav69n6zlsyfpgm9a7xk:0:::0',
          networkFees: [
            {
              amount: '840000',
              asset: 'ETH.ETH',
            },
          ],
          swapSlip: '6',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: '0x93ca9d11740794b5e93f65a9ab63c930b1db1f95',
          coins: [
            {
              amount: '2094833071',
              asset: 'ETH.ETH',
            },
          ],
          height: '13859574',
          txID: '87A3DD7D4F850E63EC05B9E4DE1A14E644CE41F44017BFCE2BF7B5660130F994',
        },
      ],
      pools: ['BTC.BTC', 'THOR.BTC'],
      status: 'success',
      type: 'swap',
    },
  ],
  count: '13',
  meta: {
    nextPageToken: '138588489000000016',
    prevPageToken: '138588609000000016',
  },
}

export default { tx, actionsResponse }
