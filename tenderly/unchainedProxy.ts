/* eslint-disable @shapeshiftoss/logger/no-native-console */
import type { evm } from '@shapeshiftoss/common-api'
import dotenv from 'dotenv'
import express from 'express'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'
import path from 'path'
import Web3 from 'web3'
import { hexToNumber, numberToHex } from 'web3-utils'
import type { RawData, WebSocket as WebSocketClient } from 'ws'
import WebSocket, { WebSocketServer } from 'ws'

import { corsMiddleware } from './middleware/cors'
import { estimateGas, getBalance, getTransactionByHash, sendTransaction } from './utils/rpcHelpers'
import type { EstimateGasParams } from './utils/types'

dotenv.config({ path: path.join(__dirname, '.env') })

const httpPort = Number(process.env.PROXY_UNCHAINED_ETHEREUM_HTTP_PORT)
const websocketPort = Number(process.env.PROXY_UNCHAINED_ETHEREUM_WS_PORT)
const provider = new Web3.providers.HttpProvider(process.env.PROXY_TENDERLY_ETHEREUM_HTTP_URL!)
let subscriptionDetails: { subscriptionId: string; address: string } | undefined
let clientWebsocket: WebSocketClient | undefined

const captureSubscriptionDetails = (rawData: RawData) => {
  const { subscriptionId, method, data } = JSON.parse(rawData.toString())

  if (method !== 'subscribe' || data.topic !== 'txs') return

  subscriptionDetails = { subscriptionId, address: data.addresses[0] }
}

const sendTxViaWebSocket = async (txId: string): Promise<void> => {
  const result = await getTransactionByHash(provider, txId)

  const data: evm.Tx = {
    txid: txId,
    blockHash: result.blockHash,
    blockHeight: hexToNumber(result.blockNumber ?? '0x0'),
    timestamp: Date.now() / 1000, // assume now
    from: result.from,
    to: result.to,
    confirmations: 10, // assume 10 confirmations
    value: result.value,
    fee: result.maxFeePerGas,
    gasLimit: result.gas,
    gasPrice: result.gasPrice,
    status: 1, // asumme success
  }

  const message = { ...subscriptionDetails, data }
  clientWebsocket?.send(JSON.stringify(message))
}

const unchainedWebsocket = new WebSocket(process.env.PROXY_UNCHAINED_ETHEREUM_WS_URL!, {
  handshakeTimeout: 5000,
})
unchainedWebsocket.on('ping', val => unchainedWebsocket.pong(val))
unchainedWebsocket.on('error', error => console.error('[websocket:unchained]', error))
unchainedWebsocket.on('connection', () =>
  console.log(
    `[websocket:unchained] connected to unchained at ${process.env.PROXY_UNCHAINED_ETHEREUM_WS_URL}`,
  ),
)

const websocketServer = new WebSocketServer({
  port: websocketPort,
})

websocketServer.on('connection', ws => {
  console.log(`[websocket:client] client connected at http://localhost:${httpPort}`)

  clientWebsocket = ws

  ws.on('error', error => console.error('[websocket:client]', error))

  // client requests go to unchained
  ws.on('message', (data: RawData) => {
    captureSubscriptionDetails(data)
    unchainedWebsocket.send(data)
  })

  // unchained responses
  unchainedWebsocket.on('message', (data: RawData) => {
    console.error('[websocket:unchained] message:', data.toString())
    ws.send(data)
  })
})

const app = express()

app.use(corsMiddleware)
app.use(express.json())

app.use(
  createProxyMiddleware(['!/api/v1/account/*', '!/api/v1/send', '!/api/v1/gas/estimate'], {
    target: process.env.PROXY_UNCHAINED_ETHEREUM_HTTP_URL,
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    followRedirects: true,
  }),
)

app.get('/api/v1/account/:pubkey', async (req, res) => {
  const balance = await getBalance(provider, req.params.pubkey)

  res.json({
    balance,
    unconfirmedBalance: 0,
    nonce: 0,
    pubkey: req.params.pubkey,
    tokens: [
      // TODO: fetch token balances
    ],
  })
})

app.post('/api/v1/send', async (req, res) => {
  const txId = await sendTransaction(provider, req.body.hex)

  // emulate unchained websocket by fetching tx from tenderly and jamming it into the websocket
  setTimeout(() => {
    if (txId) sendTxViaWebSocket(txId)
  }, 1000)

  res.json(txId)
})

app.get('/api/v1/gas/estimate', async (req, res) => {
  req.query.value = numberToHex(req.query.value as string)
  const gasLimit = await estimateGas(provider, req.query as unknown as EstimateGasParams)

  res.json({ gasLimit })
})

app.listen(httpPort, () => {
  console.log(`[http] proxy server is running at http://localhost:${httpPort}`)
})
