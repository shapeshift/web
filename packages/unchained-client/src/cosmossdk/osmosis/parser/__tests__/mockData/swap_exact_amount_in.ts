import { Tx } from '../../../../types'

const tx: Tx = {
  txid: '281639B2B73391DFDE5038FD67B5AEB74AFBB5A90C1910C3401EFDF658207B2B',
  blockHash: 'D8037AA11C7C91165D18DC14324DB43789A6268534ADD8F17A38A39519DE4259',
  blockHeight: 5742225,
  timestamp: 1661465988,
  confirmations: 83448,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '103559',
  gasWanted: '300000',
  index: 28,
  value: '',
  messages: [
    {
      origin: 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h',
      from: 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h',
      type: 'swap_exact_amount_in',
      value: {
        amount: '790572',
        denom: 'uosmo',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '76734ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        receiver: 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h',
      },
      coin_spent: {
        amount: '76734ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        spender: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
      },
      message: {
        action: '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
        module: 'gamm',
        sender: 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h',
      },
      token_swapped: {
        module: 'gamm',
        pool_id: '1',
        sender: 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h',
        tokens_in: '790572uosmo',
        tokens_out: '76734ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      },
      transfer: {
        amount: '76734ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        recipient: 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h',
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
