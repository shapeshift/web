import type { ChainId } from '@shapeshiftoss/caip'
import { avalancheChainId, bscChainId, ethChainId, optimismChainId } from '@shapeshiftoss/caip'
import { type ZodiosOptions, makeApi, Zodios } from '@zodios/core'
import { invert } from 'lodash'
import { z } from 'zod'

export enum SupportedZapperNetworksEnum {
  Ethereum = 'ethereum',
  // Polygon = 'polygon',
  Optimism = 'optimism',
  // Gnosis = 'gnosis',
  BinanceSmartChain = 'binance-smart-chain',
  // Fantom = 'fantom',
  Avalanche = 'avalanche',
  // Artbitrum = 'arbitrum',
  // Celo = 'celo',
  // Harmony = 'harmony',
  // Moonriver = 'moonriver',
  // Bitcoin = 'bitcoin', "supported" by zapper but actually not anymore
  // Cronos = 'cronos',
  // Aurora = 'aurora',
  // Evmos = 'evmos',
}

export const ZAPPER_NETWORKS_TO_CHAIN_ID_MAP: Partial<
  Record<SupportedZapperNetworksEnum, ChainId>
> = {
  [SupportedZapperNetworksEnum.Avalanche]: avalancheChainId,
  [SupportedZapperNetworksEnum.BinanceSmartChain]: bscChainId,
  [SupportedZapperNetworksEnum.Ethereum]: ethChainId,
  [SupportedZapperNetworksEnum.Optimism]: optimismChainId,
} as const

export const CHAIN_ID_TO_ZAPPER_NETWORK_MAP = invert(ZAPPER_NETWORKS_TO_CHAIN_ID_MAP) as Partial<
  Record<ChainId, SupportedZapperNetworksEnum>
>

export const zapperNetworkToChainId = (network: SupportedZapperNetworksEnum): ChainId | undefined =>
  ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToZapperNetwork = (chainId: ChainId): SupportedZapperNetworksEnum | undefined =>
  CHAIN_ID_TO_ZAPPER_NETWORK_MAP[chainId]

const SupportedZapperNetworks = z.nativeEnum(SupportedZapperNetworksEnum)

const ZerionDisplayValue = z.union([
  z.object({
    type: z.string(),
    value: z.union([z.number(), z.string()]),
  }),
  z.string(),
  z.number(),
])

const ZapperDisplayPropsSchema = z.object({
  label: z.string(),
  images: z.array(z.string()),
  statsItems: z.array(
    z.object({
      label: z.string(),
      value: ZerionDisplayValue,
    }),
  ),
  secondaryLabel: ZerionDisplayValue.optional(),
  tertiaryLabel: ZerionDisplayValue.optional(),
})

const ZapperTokenBaseSchema = z.object({
  network: SupportedZapperNetworks,
  address: z.string(),
  decimals: z.number(),
  symbol: z.string(),
  price: z.number(),
})

const ZapperTokenWithBalancesSchema = z.union([
  ZapperTokenBaseSchema,
  z.object({
    balance: z.number(),
    balanceRaw: z.string(),
    balanceUSD: z.number(),
  }),
])

const ZapperDataPropsSchema = z.object({
  apy: z.number(),
  fee: z.number().optional(),
  volume: z.number().optional(),
  reserves: z.array(z.number(), z.number()),
  liquidity: z.number(),
})

const ZapperAssetBaseSchema = z.object({
  key: z.string(),
  type: z.string(),
  appId: z.string(),
  groupId: z.string(),
  network: SupportedZapperNetworks,
  address: z.string(),
  price: z.number(),
  supply: z.number(),
  symbol: z.string(),
  decimals: z.number(),
  dataProps: ZapperDataPropsSchema,
  displayProps: ZapperDisplayPropsSchema,
  pricePerShare: z.array(z.union([z.string(), z.number()])),
  tokens: z.array(ZapperTokenBaseSchema),
})

const ZapperAssetWithBalancesSchema = z.union([
  ZapperAssetBaseSchema,
  z.object({
    tokens: z.array(ZapperTokenWithBalancesSchema),
    balance: z.number(),
    balanceRaw: z.string(),
    balanceUSD: z.number(),
  }),
])

const GasPricesResponse = z.object({
  standard: z.object({}).partial(),
  fast: z.object({}).partial(),
  instant: z.object({}).partial(),
  eip1559: z.boolean(),
})

const ZapperProductSchema = z.object({
  label: z.string(),
  assets: z.array(z.union([ZapperAssetBaseSchema, ZapperAssetWithBalancesSchema])),
  meta: z.array(z.any()),
})

const ZerionV2AppBalance = z.object({
  key: z.string(),
  address: z.string(),
  appId: z.string(),
  appName: z.string(),
  appImage: z.string(),
  network: SupportedZapperNetworks,
  updatedAt: z.string(),
  balanceUSD: z.number(),
  products: z.array(ZapperProductSchema),
})

export type V2BalancesAppsResponseType = z.infer<typeof V2BalancesAppsResponse>
const V2BalancesAppsResponse = z.array(ZerionV2AppBalance)

const V2AppTokensResponse = z.array(ZapperAssetBaseSchema)
export type V2AppTokensResponseType = z.infer<typeof V2AppTokensResponse>

const endpoints = makeApi([
  {
    method: 'get',
    path: '/v2/api-clients/points',
    description: `Get stats about the API client points`,
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/apps',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/apps/:appSlug',
    requestFormat: 'json',
    parameters: [
      {
        name: 'appSlug',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/apps/:appSlug/balances',
    requestFormat: 'json',
    parameters: [
      {
        name: 'appSlug',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/apps/:appSlug/positions',
    description: `Retrieve positions (non-tokenized) for a given application`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'appSlug',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks,
      },
      {
        name: 'groupId',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/apps/:appSlug/tokens',
    alias: 'getV2AppTokens',
    description: `Retrieve tokens for a given application`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'appSlug',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'networks',
        type: 'Query',
        schema: z.array(SupportedZapperNetworks.optional()),
      },
      {
        name: 'groupId',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: V2AppTokensResponse,
  },
  {
    method: 'get',
    path: '/v2/balances/apps',
    description: `Gets the app balances for a set of addresses and set of networks.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'networks',
        type: 'Query',
        schema: z.array(SupportedZapperNetworks.optional()),
      },
    ],
    response: V2BalancesAppsResponse,
  },
  {
    method: 'post',
    path: '/v2/balances/apps',
    description: `Recomputes the app balances for a set of addresses and set of networks.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'networks',
        type: 'Query',
        schema: z.array(SupportedZapperNetworks.optional()),
      },
    ],
    response: z.object({
      jobId: z.string(),
    }),
  },
  {
    method: 'get',
    path: '/v2/balances/job-status',
    description: `Gets the status of a single balance computation job.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'jobId',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/balances/tokens',
    description: `Gets the token balances for a set of addresses and set of networks.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'networks[]',
        type: 'Query',
        schema: z.array(SupportedZapperNetworks).optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'post',
    path: '/v2/balances/tokens',
    description: `Recomputes the token balances for a set of addresses and set of networks.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'networks[]',
        type: 'Query',
        schema: z.array(SupportedZapperNetworks).optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/exchange/price',
    description: `Returns data about the amount received if a trade would be made. **Should be called whenever a price needs to be calculated.**`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'gasPrice',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'maxFeePerGas',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'maxPriorityFeePerGas',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'sellTokenAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'buyTokenAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'sellAmount',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'buyAmount',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'ownerAddress',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'slippagePercentage',
        type: 'Query',
        schema: z.number().optional(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional().default(SupportedZapperNetworksEnum.Ethereum),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/exchange/quote',
    description: `Returns both the relative price for a trade as well as the call data used to sumbit a transaction for a trade. **Should only be called when a trade is ready to be submitted.**`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'gasPrice',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'maxFeePerGas',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'maxPriorityFeePerGas',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'sellTokenAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'buyTokenAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'sellAmount',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'buyAmount',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'ownerAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'slippagePercentage',
        type: 'Query',
        schema: z.number(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional().default(SupportedZapperNetworksEnum.Ethereum),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/exchange/supported',
    description: `Returns the exchanges supported by Zapper API.`,
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/gas-prices',
    description: `Retrieve a gas price aggregated from multiple different sources`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional().default(SupportedZapperNetworksEnum.Ethereum),
      },
      {
        name: 'eip1559',
        type: 'Query',
        schema: z.boolean(),
      },
    ],
    response: GasPricesResponse,
  },
  {
    method: 'get',
    path: '/v2/nft/balances/collections',
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'minCollectionValueUsd',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'collectionAddresses[]',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
      {
        name: 'limit',
        type: 'Query',
        schema: z.string().optional().default('25'),
      },
      {
        name: 'cursor',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/nft/balances/collections-totals',
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'minCollectionValueUsd',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'collectionAddresses[]',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/nft/balances/net-worth',
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/nft/balances/tokens',
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'minEstimatedValueUsd',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'collectionAddresses[]',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
      {
        name: 'limit',
        type: 'Query',
        schema: z.string().optional().default('25'),
      },
      {
        name: 'cursor',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/nft/balances/tokens-totals',
    requestFormat: 'json',
    parameters: [
      {
        name: 'addresses[]',
        type: 'Query',
        schema: z.array(z.string()),
      },
      {
        name: 'minEstimatedValueUsd',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'collectionAddresses[]',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/nft/collection/tokens',
    requestFormat: 'json',
    parameters: [
      {
        name: 'collectionAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks,
      },
      {
        name: 'cursor',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'tokenIds[]',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/nft/user/tokens',
    requestFormat: 'json',
    parameters: [
      {
        name: 'userAddress',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
      {
        name: 'limit',
        type: 'Query',
        schema: z.string().optional().default('50'),
      },
      {
        name: 'cursor',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/v2/prices',
    description: `Retrieve supported tokens and their prices`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'network',
        type: 'Query',
        schema: SupportedZapperNetworks.optional(),
      },
    ],
    response: z.void(),
  },
])

export const api = new Zodios(endpoints)

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}
