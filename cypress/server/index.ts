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
          let reply = JSON.stringify({
            method: 'subscribe',
            data: ethTransaction
          })
          ws.send(reply)
          ws.send(endReply)

          break
        default:
          break
      }
    } catch (error) {}
  })
})
