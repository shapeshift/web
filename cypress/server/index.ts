import WebSocket from 'ws'

import { makeEthTxHistory } from '../factories/ethereum/transactions'
const wss = new WebSocket.Server({ port: 8080 })

const ethTransactions = makeEthTxHistory()
enum TopicTypes {
  Transactions = 'txs'
}

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
      const topic = jsonMessage?.topic
      const data = jsonMessage?.data

      switch (method) {
        case 'subscribe':
          if (topic === TopicTypes.Transactions || data?.topic === TopicTypes.Transactions) {
            ethTransactions.forEach(ethTransaction => {
              const transactionReply = JSON.stringify({
                method: 'subscribe',
                topic: topic,
                subscriptionId: jsonMessage.subscriptionId,
                data: ethTransaction
              })
              ws.send(transactionReply)
            })
          }
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
      ws.send(endReply)
    } catch (error) {}
  })
})
