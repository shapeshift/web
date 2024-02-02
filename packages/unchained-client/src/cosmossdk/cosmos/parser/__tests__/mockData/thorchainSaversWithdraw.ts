import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '860B73A29EA69D7FB24B4B17893CF7CDB3B66C2BB9DD91872B140A2F325294D8',
  blockHash: '9734DB830715A41BBB137A2D270C98A1147DCE371990BF6017DD8C50993BE6B1',
  blockHeight: 18925723,
  timestamp: 1706510540,
  confirmations: 7740,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '74027',
  gasWanted: '200000',
  index: 6,
  memo: '-:GAIA/ATOM:10000',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      from: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      to: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      type: 'send',
      value: {
        amount: '100',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '100uatom',
        receiver: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
      },
      coin_spent: {
        amount: '100uatom',
        spender: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      },
      transfer: {
        amount: '100uatom',
        recipient: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
        sender: 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn',
      },
    },
  },
}

export default { tx }
