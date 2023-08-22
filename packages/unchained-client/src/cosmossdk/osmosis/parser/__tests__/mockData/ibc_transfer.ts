import type { Tx } from '../../../../types'

const tx: Tx = {
  txid: 'BC138343E87825F0B727B74CD0C6175B03002D00B077D8766858E9DB6974BC1D',
  blockHash: 'D0E2E6FE004795CC46E9B96FFF40329B30457DEEB3EBD74DD634C7C0541CBCE1',
  blockHeight: 5824968,
  timestamp: 1661977163,
  confirmations: 4,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '112252',
  gasWanted: '130000',
  index: 1,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w',
      from: 'osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w',
      to: 'cosmos1wrk4vlk03unephl72ntttcd80lnf7a2ywtzrvu',
      type: 'transfer',
      value: {
        amount: '2898071',
        denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      },
    },
  ],
  events: {
    '0': {
      burn: {
        amount: '2898071ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        burner: 'osmo1yl6hdjhmkf37639730gffanpzndzdpmhxy9ep3',
      },
      coin_received: {
        amount: '2898071ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        receiver: 'osmo1yl6hdjhmkf37639730gffanpzndzdpmhxy9ep3',
      },
      coin_spent: {
        amount: '2898071ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        spender: 'osmo1yl6hdjhmkf37639730gffanpzndzdpmhxy9ep3',
      },
      ibc_transfer: {
        receiver: 'cosmos1wrk4vlk03unephl72ntttcd80lnf7a2ywtzrvu',
        sender: 'osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w',
      },
      message: {
        action: '/ibc.applications.transfer.v1.MsgTransfer',
        module: 'transfer',
        sender: 'osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w',
      },
      send_packet: {
        packet_channel_ordering: 'ORDER_UNORDERED',
        packet_connection: 'connection-1',
        packet_data:
          '{"amount":"2898071","denom":"transfer/channel-0/uatom","receiver":"cosmos1wrk4vlk03unephl72ntttcd80lnf7a2ywtzrvu","sender":"osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w"}',
        packet_data_hex:
          '7b22616d6f756e74223a2232383938303731222c2264656e6f6d223a227472616e736665722f6368616e6e656c2d302f7561746f6d222c227265636569766572223a22636f736d6f733177726b34766c6b3033756e6570686c37326e747474636438306c6e663761327977747a727675222c2273656e646572223a226f736d6f3177726b34766c6b3033756e6570686c37326e747474636438306c6e66376132797873336e3677227d',
        packet_dst_channel: 'channel-141',
        packet_dst_port: 'transfer',
        packet_sequence: '1248748',
        packet_src_channel: 'channel-0',
        packet_src_port: 'transfer',
        packet_timeout_height: '4-11875155',
        packet_timeout_timestamp: '0',
      },
      transfer: {
        amount: '2898071ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        recipient: 'osmo1yl6hdjhmkf37639730gffanpzndzdpmhxy9ep3',
        sender: 'osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w',
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
