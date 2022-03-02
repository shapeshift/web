import WebSocket from 'ws'

import { makeEthTxHistory } from '../factories/ethereum/transactions'
const wss = new WebSocket.Server({ port: 8080 })

const ethTransactions = makeEthTxHistory()

wss.on('connection', (ws: WebSocket) => {
  const loginReply = JSON.stringify({
    method: 'connect',
    data: 'connect success'
  })

  ws.send(loginReply)

  const endReply = JSON.stringify({
    method: 'end',
    data: 'end'
  })

  ws.on('message', (message: string) => {
    try {
      const jsonMessage = JSON.parse(message)

      const method = jsonMessage?.method

      switch (method) {
        case 'subscribe':
          ethTransactions.forEach(ethTransaction => {
            const transactionReply = JSON.stringify({
              method: 'subscribe',
              subscriptionId: jsonMessage.subscriptionId,
              data: ethTransaction
            })
            ws.send(transactionReply)
          })

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
