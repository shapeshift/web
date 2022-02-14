const makeEthTransaction = require('./mocks/ethTransactions');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const ethTransaction = makeEthTransaction();

wss.on('connection', function connection(ws) {
  const loginReply = JSON.stringify({
    method: 'connect',
    data: 'connect success',
  });

  ws.send(loginReply);

  const endReply = JSON.stringify({
    method: 'end',
    data: 'end',
  });

  ws.on('message', function incoming(m) {
    try {
      // Messages are stringified by default by rxjs
      const message = JSON.parse(m);

      const method = message && message.method;

      switch (method) {
        case 'subscribe':
          let reply = JSON.stringify({
            method: 'subscribe',
            data: ethTransaction,
          });
          ws.send(reply);
          ws.send(endReply);

          break;
        default:
          break;
      }
    } catch (error) {}
  });
});
