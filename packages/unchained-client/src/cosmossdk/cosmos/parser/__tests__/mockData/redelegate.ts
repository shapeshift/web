import type { Tx } from '../../..'

const tx: Tx = {
  txid: 'A69531AE72161D6556CEE744D5D6B3D0661443FA66C89360F40EC75CF7E278CA',
  blockHash: 'C3B387CF51B0957D52A79CF5EB4E50665661AC9528C6A65501EB45DA3D3A4A49',
  blockHeight: 9636911,
  timestamp: 1646429755,
  confirmations: 2226966,
  fee: {
    amount: '6250',
    denom: 'uatom',
  },
  gasUsed: '204950',
  gasWanted: '250000',
  index: 5,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      from: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
      to: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf',
      type: 'begin_redelegate',
      value: {
        amount: '500000',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      message: {
        action: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
        module: 'staking',
        sender: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      },
      redelegate: {
        amount: '500000uatom',
        completion_time: '2022-03-25T21:35:55Z',
        destination_validator: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf',
        source_validator: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
      },
    },
  },
}

export default { tx }
