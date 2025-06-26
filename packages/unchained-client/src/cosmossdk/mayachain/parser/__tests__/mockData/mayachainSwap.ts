import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: '7C5EA840F5A7D095B5D3B8385D1D9D1680EB76E564E23D1C0FC1D4D448EEDF5D',
  blockHash: '16EA30329368821A0472F8D62D20D7F53D4FDE3FE6C18D2A36C70FE356D3DF45',
  blockHeight: 11695114,
  timestamp: 1750363784,
  confirmations: 12860,
  fee: {
    amount: '2000000000',
    denom: 'cacao',
  },
  gasUsed: '246846',
  gasWanted: '344521',
  index: 3,
  memo: '=:r:thor1g7c6jt5ynd5ruav2qucje0vuaan0q5xwa8wzaq:254019012804:_/ts:5/50',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'maya1g7c6jt5ynd5ruav2qucje0vuaan0q5xwasswts',
      from: 'maya1g7c6jt5ynd5ruav2qucje0vuaan0q5xwasswts',
      to: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      type: 'deposit',
      value: {
        amount: '236116842871614',
        denom: 'cacao',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '236116842871614cacao',
        receiver: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      },
      coin_spent: {
        amount: '236116842871614cacao',
        spender: 'maya1g7c6jt5ynd5ruav2qucje0vuaan0q5xwasswts',
      },
      message: {
        action: 'deposit',
        memo: '=:r:thor1g7c6jt5ynd5ruav2qucje0vuaan0q5xwa8wzaq:254019012804:_/ts:5/50',
        sender: 'maya1g7c6jt5ynd5ruav2qucje0vuaan0q5xwasswts',
      },
      transfer: {
        amount: '236116842871614cacao',
        recipient: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
        sender: 'maya1g7c6jt5ynd5ruav2qucje0vuaan0q5xwasswts',
      },
    },
  },
}

export default { tx }
