import { makeEthTxHistory } from '../factories/ethereum/transactions'
import WebSocket from 'ws'
const wss = new WebSocket.Server({ port: 8080 })

const ethTransaction = makeEthTxHistory()

type MessageType = 'connect' | 'subscribe' | 'end'

interface IMessage {
  method: MessageType
  data: any
}

wss.on('connection', function connection(ws) {
  const loginReply = JSON.stringify({
    method: 'connect',
    data: 'connect success',
  })

  ws.send(loginReply)

  const endReply = JSON.stringify({
    method: 'end',
    data: 'end',
  })

  ws.on('message', function incoming(message: IMessage) {
    try {
      // Messages are stringified by default by rxjs
      const jsonMessage = JSON.parse(message)

      const method = message?.method

      switch (method) {
        case 'subscribe':
          let reply = JSON.stringify({
            method: 'subscribe',
            data: ethTransaction,
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
