import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // @keepkey/asset-service@1.10.0: https://github.com/shapeshift/lib/blob/636c6c9460ac5ae4d1189165eddd3a105406e0ef/packages/asset-service/src/generateAssetData/ethTokens/extendErc20.ts#L45
    // @keepkey/market-service@1.7.0: https://github.com/shapeshift/lib/blob/9123527ebbcf0fd62a619ab2824d970123bd5ac2/packages/market-service/src/yearn/yearn.ts#L30
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
  ],
  'img-src': [
    'https://rawcdn.githack.com/yearn/yearn-assets/',
    'https://raw.githack.com/yearn/yearn-assets/',
    'https://assets.yearn.network/tokens/',
    'https://raw.githubusercontent.com/yearn/yearn-assets/',
  ],
}
