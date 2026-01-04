import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

const client = createClient({
  url: 'ws://localhost:4000/graphql',
  webSocketImpl: WebSocket,
});

console.log('Connecting to ws://localhost:4000/graphql...');

const unsubscribe = client.subscribe(
  {
    query: `subscription LimitOrdersUpdated($accountIds: [String!]!) {
      limitOrdersUpdated(accountIds: $accountIds) {
        accountId
        orders { uid status }
        timestamp
      }
    }`,
    variables: {
      accountIds: ['eip155:42161:0x6c532c436478a460fe0c1a9e3cd96364e8e01496']
    },
  },
  {
    next: (data) => {
      console.log('Received:', JSON.stringify(data, null, 2));
    },
    error: (err) => {
      console.error('Error:', err);
    },
    complete: () => {
      console.log('Subscription completed');
    },
  },
);

console.log('Subscribed! Waiting for updates...');

setTimeout(() => {
  console.log('Timeout - unsubscribing');
  unsubscribe();
  process.exit(0);
}, 15000);
