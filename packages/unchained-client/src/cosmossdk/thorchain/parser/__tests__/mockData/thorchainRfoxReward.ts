import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '405E276A38EB92CBB15D7AD54BB7C5661BE58B4DC98CBA1E44D67EA5F96F36F2',
  blockHash: 'B0B6F1FDE800DE47E0D2AFBBE446DE84894327E4EC10E73164CCA6656D1A3224',
  blockHeight: 16958238,
  timestamp: 1721787735,
  confirmations: 79224,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '4979338',
  gasWanted: '0',
  index: 15,
  memo: 'rFOX reward (Staking Address: 0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6) - Epoch #0 (IPFS Hash: QmYUiUq9UWK5NPF1h2BGdatw95psNtW8seGQpXZYoQYK1s)',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1m2420569wzzch3zgladujjhspwxkay2yyux5av',
      from: 'thor1m2420569wzzch3zgladujjhspwxkay2yyux5av',
      to: 'thor1kvyk73thppq3ns2xanql0w6ejzjuwdlf9s2mdj',
      type: 'send',
      value: {
        amount: '1',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '1rune',
        receiver: 'thor1kvyk73thppq3ns2xanql0w6ejzjuwdlf9s2mdj',
      },
      coin_spent: {
        amount: '1rune',
        spender: 'thor1m2420569wzzch3zgladujjhspwxkay2yyux5av',
      },
      message: {
        action: 'send',
        sender: 'thor1m2420569wzzch3zgladujjhspwxkay2yyux5av',
      },
      transfer: {
        amount: '1rune',
        recipient: 'thor1kvyk73thppq3ns2xanql0w6ejzjuwdlf9s2mdj',
        sender: 'thor1m2420569wzzch3zgladujjhspwxkay2yyux5av',
      },
    },
  },
}

export default { tx }
