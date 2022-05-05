# Unchained API Client

Provides a typescript axios client to interact with all supported unchained API's

## Installing

Using npm:
```
npm install @shapeshiftoss/unchained-client
```

Using yarn:
```
yarn add @shapeshiftoss/unchained-client
```

## Resources

- [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md) naming conventions used for `chainId`
- [CAIP-19](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md) naming conventions used for `assetId`

## Usage

```
import * as unchained from '@shapeshiftoss/unchained-client'

const address = 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd'

// configuration for the api client
const config = new unchained.cosmos.Configuration({ basePath: 'https://dev-api.cosmos.shapeshift.com' })

// create new instance of the api client
const apiClient = new unchained.cosmos.V1Api(config)

// create new instance of the ws client
const wsClient = new unchained.ws.Client<unchained.cosmos.Tx>('wss://dev-api.cosmos.shapeshift.com')

// create new instance of the transaction parser
// chainId is in the format of [Caip2](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)
const parser = new unchained.cosmos.TransactionParser({ chainId: 'cosmos:cosmoshub-4' })

// example api client request
const { data } = await apiClient.getBalance({ pubkey: address })

// example websocket subscription for new transaction and transaction parsing
await this.providers.ws.subscribeTxs(
  'test',
  { topic: 'txs', addresses: [address] },
  async (msg) => {
        const tx = await parser.parse(msg.data, msg.address)
  },
  (err) => console.warn(err)
)
```