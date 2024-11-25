import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '97B284C589F026818905BDB1591BFAC55754575CFBDD2456B26D8D3D4B1487DC',
  blockHash: '37A12F1FE039914927334B293B2B2F8628F45741B61E14E60B5E89AF9D7BBD99',
  blockHeight: 18730527,
  timestamp: 1732543019,
  confirmations: 2462,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '490937',
  gasWanted: '0',
  index: 149,
  memo: 'POOL-:10000:t:200',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1cwxrd57zs697k68njqvklsash74revw82mslx4',
      from: 'thor1cwxrd57zs697k68njqvklsash74revw82mslx4',
      to: 'thor1cwxrd57zs697k68njqvklsash74revw82mslx4',
      type: 'deposit',
      value: {
        amount: '0',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '2669457604rune',
        receiver: 'thor1cwxrd57zs697k68njqvklsash74revw82mslx4',
      },
      coin_spent: {
        amount: '2669457604rune',
        spender: 'thor1rzqfv62dzu585607s5awqtgnvvwz5rzhdtv772',
      },
      message: {
        action: 'deposit',
        memo: 'POOL-:10000:t:200',
        sender: 'thor1rzqfv62dzu585607s5awqtgnvvwz5rzhdtv772',
      },
      rune_pool_withdraw: {
        affiliate_address: 'thor1xnkml34dfmhtmx3hfxte4jxrxn2j3604mtx5h0',
        affiliate_amount: '3458318',
        affiliate_basis_points: '200',
        basis_points: '10000',
        rune_address: 'thor1cwxrd57zs697k68njqvklsash74revw82mslx4',
        rune_amount: '2672915922',
        tx_id: '97B284C589F026818905BDB1591BFAC55754575CFBDD2456B26D8D3D4B1487DC',
        units: '2491645482',
      },
      transfer: {
        amount: '2669457604rune',
        recipient: 'thor1cwxrd57zs697k68njqvklsash74revw82mslx4',
        sender: 'thor1rzqfv62dzu585607s5awqtgnvvwz5rzhdtv772',
      },
    },
  },
}

export default { tx }
