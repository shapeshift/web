require('dotenv').config()

const cspMeta = Object.entries({
  'default-src': ["'self'"],
  'child-src': ["'self'", 'blob:', "'report-sample'"],
  'connect-src': [
    "'self'",
    'data:',
    // @shapeshiftoss/swapper@1.15.0: https://github.com/shapeshift/lib/blob/f833ac7f8c70dee801eaa24525336ca6992e5903/packages/swapper/src/swappers/zrx/utils/zrxService.ts#L4
    'https://api.0x.org',
    // @shapeshiftoss/chain-adapters@1.22.1: https://github.com/shapeshift/lib/blob/476550629be9485bfc089decc4df85456968464a/packages/chain-adapters/src/ethereum/EthereumChainAdapter.ts#L226
    'https://gas.api.0x.org',
    // @shapeshiftoss/caip@1.6.1: https://github.com/shapeshift/lib/blob/1689995812e81a866e2c60150bdbb9afc7ce32b9/packages/caip/src/adapters/coingecko/index.ts#L5
    // @shapeshiftoss/asset-service@1.10.0: https://github.com/shapeshift/lib/blob/636c6c9460ac5ae4d1189165eddd3a105406e0ef/packages/asset-service/src/service/AssetService.ts#L130
    // @shapeshiftoss/market-service@1.7.0: https://github.com/shapeshift/lib/blob/9123527ebbcf0fd62a619ab2824d970123bd5ac2/packages/market-service/src/coingecko/coingecko.ts#L37
    'https://api.coingecko.com',
    // @shapeshiftoss/asset-service@1.10.0: https://github.com/shapeshift/lib/blob/636c6c9460ac5ae4d1189165eddd3a105406e0ef/packages/asset-service/src/generateAssetData/ethTokens/extendErc20.ts#L45
    // @shapeshiftoss/market-service@1.7.0: https://github.com/shapeshift/lib/blob/9123527ebbcf0fd62a619ab2824d970123bd5ac2/packages/market-service/src/yearn/yearn.ts#L30
    'https://api.yearn.finance',
    // @yfi/sdk@1.0.28 https://github.com/yearn/yearn-sdk/blob/master/src/context.ts#L73
    'https://cache.yearn.finance/v1/chains/',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/context.ts#L66
    'https://test-api.yearn.network/v1/',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/services/subgraph/index.ts#L9-L29
    'https://api.thegraph.com/subgraphs/name/salazarguille/yearn-vaults-v2-subgraph-mainnet',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/services/assets.ts#L7
    'https://raw.githubusercontent.com/yearn/yearn-assets/',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/services/assets.ts#L17
    'https://raw.githack.com/trustwallet/assets/',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/services/zapper.ts#L28
    'https://api.zapper.fi/v1/prices',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/services/meta.ts#22
    'https://meta.yearn.network/vaults/1/all',
    // @yfi/sdk@1.0.12: https://github.com/yearn/yearn-sdk/blob/0a85ae7be734ba594b8b7e4a290e631610a3b399/src/services/assets.ts#L13
    'https://api.github.com/repos/yearn/yearn-assets/',
    // @shapeshiftoss/caip@1.7.0: https://github.com/shapeshift/lib/blob/5a378b186bf943c9f5e5342e1333b9fbc7c0deaf/packages/caip/src/adapters/coincap/index.ts#L5
    'https://api.coincap.io/v2/assets',
    // @shapeshiftoss/market-service@1.7.0: https://github.com/shapeshift/lib/blob/9123527ebbcf0fd62a619ab2824d970123bd5ac2/packages/market-service/src/coincap/coincap.ts#L21
    'https://api.coincap.io/v2/assets/',
    process.env.REACT_APP_ETHEREUM_NODE_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_WS_URL,
    process.env.REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_COSMOS_WS_URL
  ],
  'frame-src': ['https://fwd.metamask.io/', 'https://widget.portis.io'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'filesystem:',
    'https://assets.coincap.io/assets/icons/',
    'https://static.coincap.io/assets/icons/',
    'https://assets.coingecko.com/coins/images/',
    'https://raw.githack.com/trustwallet/assets/',
    'https://rawcdn.githack.com/yearn/yearn-assets/',
    'https://raw.githack.com/yearn/yearn-assets/',
    'https://assets.yearn.network/tokens/',
    'https://raw.githubusercontent.com/yearn/yearn-assets/',
    'https://rawcdn.githack.com/trustwallet/assets/'
  ],
  'script-src': [
    "'self'",
    'blob:',
    "'unsafe-eval'", //TODO: There are still a couple of libraries we depend on that use eval; notably amqp-ts and google-protobuf.
    "'unsafe-inline'", //TODO: The only inline code we need is the stub injected by Metamask. We can fix this by including the stub in our own bundle.
    "'report-sample'"
  ],
  'style-src': ["'self'", "'unsafe-inline'", "'report-sample'"],
  'base-uri': ["'none'"],
  'object-src': ["'none'"]
})
  .map(([k, v]) => `${[k, ...v].join(' ')}`)
  .join('; ')

const headers = {
  'Cache-Control': 'no-transform', // This will prevent middleboxes from munging our JS and breaking SRI if we're ever served over HTTP
  'Content-Security-Policy': `${cspMeta}; frame-ancestors 'none'`, // `; report-uri https://shapeshift.report-uri.com/r/d/csp/wizard`,
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'document-domain=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
}

module.exports = {
  headers,
  cspMeta
}

if (!module.parent) {
  require('fs').writeFileSync(
    './build/_headers',
    `/*\n${Object.entries(headers)
      .map(([k, v]) => `  ${k}: ${v}\n`)
      .join('')}`
  )
}
