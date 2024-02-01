import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '1BD2FB635E744E6C7919E9771A0E277BDBB9C0BB9FB990D9353334E1971AE2C6',
  blockHash: '34BA00E4BF8E80D0EBE4266599D4CD8118927351A681180B6192A719E552D74B',
  blockHeight: 18869807,
  timestamp: 1706166570,
  confirmations: 63825,
  fee: {
    amount: '3000',
    denom: 'uatom',
  },
  gasUsed: '74767',
  gasWanted: '200000',
  index: 2,
  memo: 'OUT:E8C9E5708C60F1C17AB106851EB19B0BF8A888A5FA0E079B7DFC7DBDB8B2E21D',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos12sdwha358f7rdpn6t77aqjmmzcz03x0gs9hmls',
      from: 'cosmos12sdwha358f7rdpn6t77aqjmmzcz03x0gs9hmls',
      to: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      type: 'send',
      value: {
        amount: '48123192',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '48123192uatom',
        receiver: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
      },
      coin_spent: {
        amount: '48123192uatom',
        spender: 'cosmos12sdwha358f7rdpn6t77aqjmmzcz03x0gs9hmls',
      },
      message: {
        action: '/cosmos.bank.v1beta1.MsgSend',
        module: 'bank',
        sender: 'cosmos12sdwha358f7rdpn6t77aqjmmzcz03x0gs9hmls',
      },
      transfer: {
        amount: '48123192uatom',
        recipient: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
        sender: 'cosmos12sdwha358f7rdpn6t77aqjmmzcz03x0gs9hmls',
      },
    },
  },
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1706166545420371453',
      height: '14419266',
      in: [
        {
          address: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
          coins: [
            {
              amount: '100',
              asset: 'GAIA.ATOM',
            },
          ],
          txID: 'E8C9E5708C60F1C17AB106851EB19B0BF8A888A5FA0E079B7DFC7DBDB8B2E21D',
        },
      ],
      metadata: {
        withdraw: {
          asymmetry: '0',
          basisPoints: '10000',
          impermanentLossProtection: '0',
          liquidityUnits: '-4726030971',
          memo: '-:GAIA.ATOM:10000',
          networkFees: [
            {
              amount: '10823500',
              asset: 'GAIA.ATOM',
            },
          ],
        },
      },
      out: [
        {
          address: 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w',
          coins: [
            {
              amount: '4812319200',
              asset: 'GAIA.ATOM',
            },
          ],
          height: '14419273',
          txID: '1BD2FB635E744E6C7919E9771A0E277BDBB9C0BB9FB990D9353334E1971AE2C6',
        },
      ],
      pools: ['GAIA.ATOM'],
      status: 'success',
      type: 'withdraw',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '144192661000720005',
    prevPageToken: '144192661000720005',
  },
}

export default { tx, actionsResponse }
