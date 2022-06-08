import type { ErrorResponse, RequestPayload, Topics, TxsTopicData } from '@shapeshiftoss/common-api'
import { Logger } from '@shapeshiftoss/logger'
import WebSocket from 'isomorphic-ws'

const logger = new Logger({
  namespace: ['unchained-client', 'websocket'],
  level: process.env.LOG_LEVEL
})

export interface Connection {
  ws: WebSocket
  pingTimeout?: NodeJS.Timeout
  interval: NodeJS.Timeout
}

export interface TransactionMessage<T> {
  address: string
  data: T
  subscriptionId: string
}

export interface TxsParams<T> {
  data: TxsTopicData | undefined
  onMessage: (message: TransactionMessage<T>) => void
  onError?: (err: ErrorResponse) => void
}

export type SubscriptionId = string

export class Client<T> {
  private readonly url: string
  private readonly connections: Record<Topics, Connection | undefined>
  private readonly pingInterval = 10000

  private txs: Record<SubscriptionId, TxsParams<T>> = {}

  constructor(url: string) {
    this.url = url

    this.connections = {
      txs: undefined
    }
  }

  private heartbeat(topic: Topics): void {
    const connection = this.connections[topic]
    if (!connection) return

    connection.pingTimeout && clearTimeout(connection.pingTimeout)
    connection.pingTimeout = setTimeout(() => {
      logger.warn({ fn: 'pingTimeout' }, `${topic} heartbeat failed`)
      connection?.ws.close()
    }, this.pingInterval + 5000)
  }

  /**
   * Subscribe to transaction history and updates for newly confirmed and pending transactions.
   *
   * - Subsequent calls to `subscribeTxs` for the same `subscriptionId` will add additional addresses to be watched.
   *
   * @param subscriptionId unique id for grouping of addresses
   * @param data details for subscribe
   * @param data.topic specifies which topic to subscribe to
   * @param data.addresses list of addresses to subscribe to
   * @param onMessage handler for all transaction messages associated with `subscriptionId`
   * @param [onError] optional handler for any error messages associated with `subscriptionId`
   */
  async subscribeTxs(
    subscriptionId: string,
    data: TxsTopicData,
    onMessage: (message: TransactionMessage<T>) => void,
    onError?: (err: ErrorResponse) => void
  ): Promise<void> {
    // keep track of the onMessage and onError handlers associated with each subscriptionId
    this.txs[subscriptionId] = { onMessage, onError, data: undefined }

    if (this.connections.txs) {
      if (this.connections.txs.ws.readyState === 1) {
        // subscribe if connection exists and is ready
        this.connections.txs.ws.send(
          JSON.stringify({ subscriptionId, method: 'subscribe', data } as RequestPayload)
        )
      } else {
        // queue up unique addresses for subscriptions if connection exists, but is not ready yet
        const txsData = this.txs[subscriptionId].data
        this.txs[subscriptionId].data = txsData
          ? { ...txsData, addresses: [...new Set(...txsData.addresses, ...data.addresses)] }
          : data
      }
      return
    }

    const ws = new WebSocket(this.url)

    const interval = setInterval(() => {
      // browsers do not support ping/pong frame, send ping payload instead
      const payload: RequestPayload = { subscriptionId: '', method: 'ping' }
      ws.send(JSON.stringify(payload))
    }, this.pingInterval)

    this.connections.txs = { ws, interval }

    // send connection errors to all subscription onError handlers
    ws.onerror = (event) => {
      Object.entries(this.txs).forEach(([id, sub]) => {
        sub.onError && sub.onError({ subscriptionId: id, type: 'error', message: event.message })
      })
    }

    // clear heartbeat timeout on close
    ws.onclose = () => {
      this.connections.txs?.pingTimeout && clearTimeout(this.connections.txs.pingTimeout)
      this.connections.txs?.interval && clearInterval(this.connections.txs.interval)
    }

    ws.onmessage = (event) => {
      if (!event) return
      if (event.type !== 'message') return

      if (event.data === 'pong') {
        // trigger heartbeat keep alive on pong response
        this.heartbeat('txs')
        return
      }

      try {
        const message = JSON.parse(event.data.toString()) as TransactionMessage<T> | ErrorResponse

        // narrow type to ErrorResponse if key `type` exists and forward to correct onError handler
        if ('type' in message) {
          const onErrorHandler = this.txs[message.subscriptionId || subscriptionId]?.onError
          onErrorHandler && onErrorHandler(message)
          return
        }

        // forward the transaction message to the correct onMessage handler
        const onMessageHandler = this.txs[message.subscriptionId || subscriptionId]?.onMessage
        onMessageHandler && onMessageHandler(message)
      } catch (err) {
        logger.warn(`failed to handle onmessage event: ${JSON.stringify(event)}: ${err}`)
      }
    }

    // wait for the connection to open
    const openConnection = new Promise((resolve, reject) => {
      ws.onopen = () => {
        this.heartbeat('txs')

        try {
          // subscribe to all queued subscriptions
          Object.values(this.txs).forEach((tx) => {
            if (!tx.data) return
            const payload: RequestPayload = { subscriptionId, method: 'subscribe', data: tx.data }
            ws.send(JSON.stringify(payload))
            delete this.txs[subscriptionId].data
          })

          // subscribe to initial subscription
          const payload: RequestPayload = { subscriptionId, method: 'subscribe', data }
          ws.send(JSON.stringify(payload))

          resolve(true)
        } catch (err) {
          reject(err)
        }
      }
    })

    const connectionTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout while trying to connect')), 5000)
    })

    await Promise.race([openConnection, connectionTimeout])
  }

  /**
   * Unsubscribe from transaction history and updates for newly confirmed and pending transactions.
   *
   * - If `subscriptionId` is provided, any provided addresses will be unsubscribed from.
   *   If no addresses are provided, the subscription will be unsubscribed from.
   *
   * - If `subscriptionId` is not provided, all subscriptions will be unsubscribed from.
   *
   * @param [subscriptionId] unique identifier to unsubscribe from
   * @param [data] details for unsubscribe
   * @param data.topic specifies which topic to unsubscribe from
   * @param data.addresses list of addresses to unsubscribe from
   */
  unsubscribeTxs(subscriptionId?: string, data?: TxsTopicData): void {
    if (this.connections.txs?.ws.readyState !== WebSocket.OPEN) return
    if (!subscriptionId) this.txs = {}
    if (subscriptionId && !data?.addresses.length) delete this.txs[subscriptionId]

    const payload: RequestPayload = {
      subscriptionId: subscriptionId ?? '',
      method: 'unsubscribe',
      data: { topic: 'txs', addresses: data?.addresses ?? [] }
    }

    this.connections.txs?.ws.send(JSON.stringify(payload))
  }

  /**
   * Close and unsubscribe from any subscriptions
   *
   * - If no topic is provided, all supported topics will be closed and unsubscribed from
   *
   * @param [topic] specifies which topic to close and unsubscribe from
   */
  close(topic?: Topics): void {
    const closeTxs = () => {
      this.unsubscribeTxs()
      this.connections.txs?.ws.close()
    }

    // close all connections if no topic is provided
    if (!topic) {
      closeTxs()
      return
    }

    switch (topic) {
      case 'txs':
        closeTxs()
        break
      default:
        logger.warn(`topic: ${topic} not supported`)
    }
  }
}
