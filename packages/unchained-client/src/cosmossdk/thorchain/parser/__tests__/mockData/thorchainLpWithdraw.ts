import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
  blockHash: 'AA0E7FB2592E9DBCE3C863EFA063DB839409D0936DBBA7801ABC9F7B32DC154F',
  blockHeight: 14492548,
  timestamp: 1706619374,
  confirmations: 5051,
  fee: {
    amount: '2000000',
    denom: 'rune',
  },
  gasUsed: '15945250',
  gasWanted: '0',
  index: 69,
  memo: '-:BNB.BTCB-1de:10000',
  value: '',
  messages: [
    {
      index: '0',
      origin: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
      from: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
      to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      type: 'deposit',
      value: {
        amount: '0',
        denom: 'rune',
      },
    },
    {
      index: '0',
      origin: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      to: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
      type: 'outbound',
      value: {
        amount: '106772664803',
        denom: 'rune',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '106772664803rune',
        receiver: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
      },
      coin_spent: {
        amount: '106772664803rune',
        spender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      fee: {
        coins: '2000000 THOR.RUNE',
        pool_deduct: '0',
        tx_id: '761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
      },
      message: {
        action: 'deposit',
        memo: '-:BNB.BTCB-1de:10000',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      outbound: {
        chain: 'THOR',
        coin: '106772664803 THOR.RUNE',
        from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
        id: '0000000000000000000000000000000000000000000000000000000000000000',
        in_tx_id: '761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
        memo: 'OUT:761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
        to: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
      },
      scheduled_outbound: {
        chain: 'BNB',
        coin_amount: '11511070',
        coin_asset: 'BNB.BTCB-1DE',
        coin_decimals: '0',
        gas_rate: '11250',
        in_hash: '761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
        max_gas_amount_0: '7500',
        max_gas_asset_0: 'BNB.BNB',
        max_gas_decimals_0: '8',
        memo: 'OUT:761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
        module_name: '',
        out_hash: '',
        to_address: 'bnb1k6lewfsn539yvlkge9kg0kcrm6r37qxtr4fpms',
        vault_pub_key:
          'thorpub1addwnpepqfuz5vr7g9c9nezaceqqkjzel9ls4jyzxgqpzgfyw5qm5yjsr8faz5y04pm',
      },
      transfer: {
        amount: '106772664803rune',
        recipient: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
        sender: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
      withdraw: {
        asymmetry: '0.000000000000000000',
        basis_points: '10000',
        chain: 'THOR',
        coin: '0 THOR.RUNE',
        emit_asset: '11513379',
        emit_rune: '106774664803',
        from: 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58',
        id: '761E35A0A052887678092B2FF7A5BD85CD21AA8661270B6C0AF0B4808F2F5510',
        imp_loss_protection: '0',
        liquidity_provider_units: '43670253301',
        memo: '-:BNB.BTCB-1de:10000',
        pool: 'BNB.BTCB-1DE',
        to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
      },
    },
  },
}

export default { tx }
