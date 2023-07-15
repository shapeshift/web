import type { Tx } from '../../..'

// https://www.mintscan.io/osmosis/txs/AA58EDA8D4E86F1E532F1FEC4D4F1C645050DBF1261BAA607B74A9E92B2F17E3

const tx: Tx = {
  txid: '314006B46AA5FE6DB8CD530457BD971931C9B39D2FB319FF0030EE331DD01AAC',
  blockHash: '8613998515AF83829CF2052A812B8CB4AF2FECE8027D0AB29526097B39ED7032',
  blockHeight: 8002571,
  timestamp: 1674859220,
  confirmations: 45147,
  fee: {
    amount: '0',
    denom: 'uosmo',
  },
  gasUsed: '137366',
  gasWanted: '280000',
  index: 1,
  value: '',
  messages: [
    {
      index: '0',
      origin: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      from: '',
      to: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      type: 'exit_pool',
      value: {
        amount: '24670050',
        denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      },
    },
    {
      index: '0',
      origin: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      from: '',
      to: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      type: 'exit_pool',
      value: {
        amount: '335768900',
        denom: 'uosmo',
      },
    },
    {
      index: '0',
      origin: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      from: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      to: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      type: 'exit_pool',
      value: {
        amount: '2412819982721898705868',
        denom: 'gamm/pool/1',
      },
    },
  ],
  events: {
    '0': {
      burn: {
        amount: '2412819982721898705868gamm/pool/1',
        burner: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      },
      coin_received: {
        amount: '2412819982721898705868gamm/pool/1',
        receiver: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      },
      coin_spent: {
        amount: '2412819982721898705868gamm/pool/1',
        spender: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
      },
      message: {
        action: '/osmosis.gamm.v1beta1.MsgExitPool',
        module: 'gamm',
        sender: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
      },
      pool_exited: {
        module: 'gamm',
        pool_id: '1',
        sender: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
        tokens_out:
          '24670050ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2,335768900uosmo',
      },
      transfer: {
        amount: '2412819982721898705868gamm/pool/1',
        recipient: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
        sender: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
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
