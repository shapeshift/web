import type { Tx } from '../../..'

const tx: Tx = {
  txid: '0CEBDC92B69909CF1642846618E527A81D738F9000FFE89BE84410ECCF3CC11F',
  blockHash: '7148193396201649515E81D67693BC04BBF808D48C081EBE367F25FBB95D013A',
  blockHeight: 11875225,
  timestamp: 1661978633,
  confirmations: 6,
  fee: {
    amount: '3250',
    denom: 'uatom',
  },
  gasUsed: '88978',
  gasWanted: '130000',
  index: 4,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm',
      from: 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm',
      to: 'osmo1syj2za9lxkhgpd9zm5lzfss9f6qcuycae0x7pf',
      type: 'transfer',
      value: {
        amount: '600000',
        denom: 'uatom',
      },
    },
  ],
  events: {
    '0': {
      coin_received: {
        amount: '600000uatom',
        receiver: 'cosmos1x54ltnyg88k0ejmk8ytwrhd3ltm84xehrnlslf',
      },
      coin_spent: {
        amount: '600000uatom',
        spender: 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm',
      },
      ibc_transfer: {
        receiver: 'osmo1syj2za9lxkhgpd9zm5lzfss9f6qcuycae0x7pf',
        sender: 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm',
      },
      message: {
        action: '/ibc.applications.transfer.v1.MsgTransfer',
        module: 'transfer',
        sender: 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm',
      },
      send_packet: {
        packet_channel_ordering: 'ORDER_UNORDERED',
        packet_connection: 'connection-257',
        packet_data:
          '{"amount":"600000","denom":"uatom","receiver":"osmo1syj2za9lxkhgpd9zm5lzfss9f6qcuycae0x7pf","sender":"cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm"}',
        packet_data_hex:
          '7b22616d6f756e74223a22363030303030222c2264656e6f6d223a227561746f6d222c227265636569766572223a226f736d6f3173796a327a61396c786b68677064397a6d356c7a667373396636716375796361653078377066222c2273656e646572223a22636f736d6f733173796a327a61396c786b68677064397a6d356c7a66737339663671637579636133353477686d227d',
        packet_dst_channel: 'channel-0',
        packet_dst_port: 'transfer',
        packet_sequence: '1258481',
        packet_src_channel: 'channel-141',
        packet_src_port: 'transfer',
        packet_timeout_height: '1-5825355',
        packet_timeout_timestamp: '0',
      },
      transfer: {
        amount: '600000uatom',
        recipient: 'cosmos1x54ltnyg88k0ejmk8ytwrhd3ltm84xehrnlslf',
        sender: 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm',
      },
    },
  },
}

export default { tx }
