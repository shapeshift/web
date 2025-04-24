import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: 'A6ECD575B47DBD8D7FC4D5F6A8974F0085B67E092B084F653B959298124B47D0',
  blockHash: '69B82294CC7C47BF721FBFF81E3032C3B2702A340059605A8646985CEA5E3270',
  blockHeight: 10831873,
  timestamp: 1745348353,
  confirmations: 10,
  fee: {
    amount: '2000000000',
    denom: 'cacao',
  },
  gasUsed: '84256',
  gasWanted: '86213',
  index: 0,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      from: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      to: 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7',
      type: 'send',
      value: {
        amount: '43980000000000',
        denom: 'cacao',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '43980000000000cacao',
        receiver: 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7',
      },
      coin_spent: {
        amount: '43980000000000cacao',
        spender: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      },
      message: {
        action: 'send',
        module: 'governance',
        sender: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      },
      transfer: {
        amount: '43980000000000cacao',
        recipient: 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7',
        sender: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
      },
    },
  },
}

export default { tx }
