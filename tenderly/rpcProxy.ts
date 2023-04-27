import dotenv from 'dotenv'
import type { Request } from 'express'
import express from 'express'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'
import path from 'path'
import url from 'url'

import { corsMiddleware } from './middleware/cors'
import { createThrottleMiddleware } from './middleware/throttle'

dotenv.config({ path: path.join(__dirname, '.env') })

const port = Number(process.env.PROXY_ETHEREUM_NODE_PORT!)
const tenderlyRpcUrl = url.parse(process.env.PROXY_TENDERLY_ETHEREUM_HTTP_URL!)

// only forward transaction calls to tenderly
const tenderlyFilter = (_path: string, req: Request): boolean => {
  const maybeEthMethod = req.body?.method
  return (
    typeof maybeEthMethod === 'string' &&
    ['eth_sendTransaction', 'eth_signTransaction'].includes(maybeEthMethod)
  )
}

const defaultFilter = (path: string, req: Request): boolean => {
  return !tenderlyFilter(path, req)
}

const tenderlyProxy = createProxyMiddleware(tenderlyFilter, {
  target: `${tenderlyRpcUrl.protocol}//${tenderlyRpcUrl.host}`,
  pathRewrite: { '^/': `${tenderlyRpcUrl.pathname}/` },
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  followRedirects: true,
})

const defaultProxy = createProxyMiddleware(defaultFilter, {
  target: process.env.PROXY_ETHEREUM_NODE_URL,
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  followRedirects: true,
})

const app = express()
app.use(corsMiddleware)
app.use(
  createThrottleMiddleware({
    capacity: 20,
    costPerReq: 4,
    drainPerInterval: 20,
    intervalMs: 1000,
  }),
)
app.use(tenderlyProxy)
app.use(defaultProxy)
app.listen(port, () => {
  // eslint-disable-next-line @shapeshiftoss/logger/no-native-console
  console.log(`proxy server is running at http://localhost:${port}`)
})
