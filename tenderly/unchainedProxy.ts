import type { evm } from '@shapeshiftoss/common-api'
import dotenv from 'dotenv'
import express from 'express'
import { readFileSync } from 'fs'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'
import Web3 from 'web3'
import type { Transaction } from 'web3-types'
import { hexToNumber, numberToHex } from 'web3-utils'
import type { RawData, WebSocket as WebSocketClient } from 'ws'
import WebSocket, { WebSocketServer } from 'ws'

import { corsMiddleware } from './middleware/cors'
import {
  PROXY_UNCHAINED_ETHEREUM_HTTP_PORT,
  PROXY_UNCHAINED_ETHEREUM_WS_PORT,
  TOKEN_CONTRACT_ADDRESSES,
} from './utils/constants'
import { getTenderlyRpcUrl } from './utils/getTenderlyRpcUrl'
import { getTokenBalance, getTokenInfo } from './utils/getTokenInfo'
import { estimateGas, getBalance, getTransactionByHash, sendTransaction } from './utils/rpcHelpers'

const { REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL, REACT_APP_UNCHAINED_ETHEREUM_WS_URL } = dotenv.parse(
  readFileSync('.env.dev'),
)

const provider = new Web3.providers.HttpProvider(getTenderlyRpcUrl())
const web3 = new Web3(provider)
const httpPort = Number(PROXY_UNCHAINED_ETHEREUM_HTTP_PORT)
const websocketPort = Number(PROXY_UNCHAINED_ETHEREUM_WS_PORT)
let subscriptionDetails: { subscriptionId: string; address: string } | undefined
let clientWebsocket: WebSocketClient | undefined

const captureSubscriptionDetails = (rawData: RawData) => {
  const { subscriptionId, method, data } = JSON.parse(rawData.toString())

  if (method !== 'subscribe' || data.topic !== 'txs') return

  subscriptionDetails = { subscriptionId, address: data.addresses[0] }
}

const sendTxViaWebSocket = async (txid: string): Promise<void> => {
  const result = await getTransactionByHash(provider, txid)

  // for safety we coalesce to '0x0' for optionals but in practice should never be the case
  const data: evm.Tx = {
    txid,
    blockHash: result.blockHash?.toString() ?? '0x0',
    blockHeight: hexToNumber(result.blockNumber?.toString() ?? '0x0'),
    timestamp: Date.now() / 1000, // assume now
    from: result.from,
    to: result.to!, // 'to' address is only missing for contract creation
    confirmations: 10, // assume 10 confirmations
    value: result.value?.toString() ?? '0x0',
    fee: result.maxFeePerGas?.toString() ?? '0x0',
    gasLimit: result.gas?.toString() ?? '0x0',
    gasPrice: result.gasPrice?.toString() ?? '0x0',
    status: 1, // asumme success
  }

  const message = { ...subscriptionDetails, data }
  clientWebsocket?.send(JSON.stringify(message))
}

const unchainedWebsocket = new WebSocket(REACT_APP_UNCHAINED_ETHEREUM_WS_URL, {
  handshakeTimeout: 5000,
})
unchainedWebsocket.on('ping', val => unchainedWebsocket.pong(val))
unchainedWebsocket.on('error', error => console.error('[websocket:unchained]', error))
unchainedWebsocket.on('connection', () =>
  console.log(
    `[websocket:unchained] connected to unchained at ${REACT_APP_UNCHAINED_ETHEREUM_WS_URL}`,
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
    target: REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    followRedirects: true,
    logLevel: 'error',
  }),
)

app.get('/api/v1/account/:pubkey', async (req, res) => {
  const balance = await getBalance(provider, req.params.pubkey)

  const tokenInfo = await getTokenInfo(web3)

  const result: evm.Account = {
    balance,
    unconfirmedBalance: '0',
    nonce: 0,
    pubkey: req.params.pubkey,
    tokens: (
      await Promise.all(
        TOKEN_CONTRACT_ADDRESSES.map(async contract => ({
          ...tokenInfo[contract],
          balance: await getTokenBalance(web3, contract, req.params.pubkey),
        })),
      )
    ).filter(({ balance }) => balance !== '0'),
  }

  res.json(result)
})

app.post('/api/v1/send', async (req, res) => {
  const txId = await sendTransaction(provider, req.body.hex)

  // emulate unchained websocket by fetching tx from tenderly and jamming it into the websocket
  setTimeout(() => {
    if (txId) sendTxViaWebSocket(txId)
  }, 10000)

  res.json(txId)
})

app.get('/api/v1/gas/estimate', async (req, res) => {
  req.query.value = numberToHex(req.query.value as string)
  const result: evm.GasEstimate = {
    gasLimit: await estimateGas(provider, req.query as unknown as Transaction),
  }

  res.json(result)
})

app.listen(httpPort, () => {
  console.log(`[http] proxy server is running at http://localhost:${httpPort}`)
})
