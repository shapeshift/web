export default {
  tx: {
    txid: '51D1916A963DDDC01A507D3323A27D59C88C9EFC0F1666E0FA4F326C451CE4C4',
    blockHash: 'C09E8EA1D6CD85AE8CFC2CF90B5D02EF79742167F0A161580077D44149616C65',
    blockHeight: 8418140,
    timestamp: 1637387732,
    confirmations: 1632185,
    fee: {
      amount: '0',
      denom: 'uosmo',
    },
    gasUsed: '66033',
    gasWanted: '1350000',
    index: 11,
    value: '',
    messages: [
      {
        origin: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        from: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        to: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
        type: 'transfer',
        value: {
          amount: '108444',
          denom: 'uatom',
        },
      },
    ],
    events: {
      '0': [
        {
          type: 'ibc_transfer',
          attributes: [
            {
              key: 'sender',
              value: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
            },
            {
              key: 'receiver',
              value: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
            },
          ],
        },
        {
          type: 'message',
          attributes: [
            {
              key: 'action',
              value: 'transfer',
            },
            {
              key: 'sender',
              value: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
            },
            {
              key: 'module',
              value: 'ibc_channel',
            },
            {
              key: 'module',
              value: 'transfer',
            },
          ],
        },
        {
          type: 'send_packet',
          attributes: [
            {
              key: 'packet_data',
              value:
                '{"amount":"108444","denom":"uatom","receiver":"osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt","sender":"cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e"}',
            },
            {
              key: 'packet_timeout_height',
              value: '4-2065302',
            },
            {
              key: 'packet_timeout_timestamp',
              value: '0',
            },
            {
              key: 'packet_sequence',
              value: '154193',
            },
            {
              key: 'packet_src_port',
              value: 'transfer',
            },
            {
              key: 'packet_src_channel',
              value: 'channel-141',
            },
            {
              key: 'packet_dst_port',
              value: 'transfer',
            },
            {
              key: 'packet_dst_channel',
              value: 'channel-0',
            },
            {
              key: 'packet_channel_ordering',
              value: 'ORDER_UNORDERED',
            },
            {
              key: 'packet_connection',
              value: 'connection-257',
            },
          ],
        },
        {
          type: 'transfer',
          attributes: [
            {
              key: 'recipient',
              value: 'cosmos1x54ltnyg88k0ejmk8ytwrhd3ltm84xehrnlslf',
            },
            {
              key: 'sender',
              value: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
            },
            {
              key: 'amount',
              value: '108444uatom',
            },
          ],
        },
      ],
    },
  },
}
