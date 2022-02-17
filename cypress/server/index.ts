import WebSocket from 'ws'

import { makeEthTxHistory } from '../factories/ethereum/transactions'
const wss = new WebSocket.Server({ port: 8080 })

const ethTransaction = makeEthTxHistory()

wss.on('connection', function connection(ws: WebSocket) {
  const loginReply = JSON.stringify({
    method: 'connect',
    data: 'connect success'
  })

  ws.send(loginReply)

  const endReply = JSON.stringify({
    method: 'end',
    data: 'end'
  })

  ws.on('message', function incoming(message: string) {
    try {
      const jsonMessage = JSON.parse(message)

      const method = jsonMessage?.method

      switch (method) {
        case 'subscribe':
          for (let i = 0; i < ethTransaction.length; i++) {
            let reply = JSON.stringify({
              method: 'subscribe',
              subscriptionId: jsonMessage.subscriptionId,
              data: ethTransaction[i]
            })
            ws.send(reply)
          }

          ws.send(endReply)

          break
        case 'unsubscribe':
          ws.send({
            method: 'unsubscribe',
            data: {}
          })
          ws.send(endReply)

          break
        default:
          break
      }
    } catch (error) {}
  })
})
