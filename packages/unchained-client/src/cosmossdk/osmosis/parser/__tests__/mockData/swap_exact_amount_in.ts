import type { Tx } from '../../..'

const tx: Tx = {
  txid: '829215DED31A13831D0EC7E80FE04EB5A9F3CCF1F42C610A8B75F574C3978256',
  blockHash: '8CEBC47C5AA44E8DAD7D55E31DBC6951C6C653C7EB5C6F39BB6C59F72900FA7D',
  blockHeight: 6922923,
  timestamp: 1668634847,
  confirmations: 205922,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '112937',
  gasWanted: '300000',
  index: 39,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      from: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      to: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
      type: 'swap_exact_amount_in',
      value: {
        amount: '30000',
        denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      },
    },
    {
      index: '0',
      origin: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      from: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
      to: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      type: 'swap_exact_amount_in',
      value: {
        amount: '268124',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '268124uosmo',
        receiver: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      },
      coin_spent: {
        amount: '268124uosmo',
        spender: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
      },
      message: {
        action: '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
        module: 'gamm',
        sender: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      },
      token_swapped: {
        module: 'gamm',
        pool_id: '1',
        sender: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
        tokens_in: '30000ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        tokens_out: '268124uosmo',
      },
      transfer: {
        amount: '268124uosmo',
        recipient: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
        sender: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
      },
    },
  },
}

export default {
  tx,
  txNoFee: tx,
  txWithFee: {
    ...tx,
    fee: {
      amount: '12345',
      denom: 'uosmo',
    },
  },
}
