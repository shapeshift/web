import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: 'E2049D6D672DAD5AC2EDA40224AB74C921DB8A700F94EFC005797742A483BBF8',
  blockHash: '745F9FC1DE3E1270783D0C2EA81A680FD23B8F960E94F034CCEF5107C3C80180',
  blockHeight: 11558924,
  timestamp: 1749590045,
  confirmations: 150928,
  fee: {
    amount: '2000000000',
    denom: 'cacao',
  },
  gasUsed: '252787',
  gasWanted: '500000000',
  index: 0,
  memo: '=:ETH.USDT:0xeba7239d9758f131b19797a56543e7daa8aa922e:266949978401/3/0:wr:125',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'maya1ytvlu6lpzudrr7tsg64mzqclhdvk4pzkhcaay2',
      from: 'maya1ytvlu6lpzudrr7tsg64mzqclhdvk4pzkhcaay2',
      to: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      type: 'deposit',
      value: {
        amount: '130000000000000',
        denom: 'cacao',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '130000000000000cacao',
        receiver: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
      },
      coin_spent: {
        amount: '130000000000000cacao',
        spender: 'maya1ytvlu6lpzudrr7tsg64mzqclhdvk4pzkhcaay2',
      },
      message: {
        action: 'deposit',
        memo: '=:ETH.USDT:0xeba7239d9758f131b19797a56543e7daa8aa922e:266949978401/3/0:wr:125',
        sender: 'maya1ytvlu6lpzudrr7tsg64mzqclhdvk4pzkhcaay2',
      },
      transfer: {
        amount: '130000000000000cacao',
        recipient: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
        sender: 'maya1ytvlu6lpzudrr7tsg64mzqclhdvk4pzkhcaay2',
      },
    },
  },
}

export default { tx }
