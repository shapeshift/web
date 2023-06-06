import dotenv from 'dotenv'
import type { Request } from 'express'
import express from 'express'
import { readFileSync } from 'fs'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'
import url from 'url'

import { corsMiddleware } from './middleware/cors'
import { createThrottleMiddleware } from './middleware/throttle'
import { PROXY_ETHEREUM_NODE_PORT } from './utils/constants'
import { getTenderlyRpcUrl } from './utils/getTenderlyRpcUrl'

const { REACT_APP_ETHEREUM_NODE_URL } = dotenv.parse(readFileSync('.env.dev'))

const port = Number(PROXY_ETHEREUM_NODE_PORT)
const tenderlyRpcUrl = url.parse(getTenderlyRpcUrl())

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
  logLevel: 'error',
})

const defaultProxy = createProxyMiddleware(defaultFilter, {
  target: REACT_APP_ETHEREUM_NODE_URL,
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  followRedirects: true,
  logLevel: 'error',
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
  console.log(`proxy server is running at http://localhost:${port}`)
})
