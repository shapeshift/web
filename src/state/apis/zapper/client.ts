import type { ChainId } from '@shapeshiftoss/caip'
import { avalancheChainId, bscChainId, ethChainId, optimismChainId } from '@shapeshiftoss/caip'
import { type ZodiosOptions, makeApi, Zodios } from '@zodios/core'
import { invertBy } from 'lodash'
import { z } from 'zod'

const GasPricesResponse = z.object({
  standard: z.object({}).partial(),
  fast: z.object({}).partial(),
  instant: z.object({}).partial(),
  eip1559: z.boolean(),
})

export enum SupportedZapperNetworksEnum {
  Ethereum = 'ethereum',
  Polygon = 'polygon',
  Optimism = 'optimism',
  Gnosis = 'gnosis',
  BinanceSmartChain = 'binance-smart-chain',
  Fantom = 'fantom',
  Avalanche = 'avalanche',
  Artbitrum = 'arbitrum',
  Celo = 'celo',
  Harmony = 'harmony',
  Moonriver = 'moonriver',
  Bitcoin = 'bitcoin',
  Cronos = 'cronos',
  Aurora = 'aurora',
  Evmos = 'evmos',
}

const SupportedZapperNetworks = z.nativeEnum(SupportedZapperNetworksEnum)

export const ZAPPER_NETWORKS_TO_CHAIN_ID_MAP: Partial<
  Record<SupportedZapperNetworksEnum, ChainId>
> = {
  [SupportedZapperNetworksEnum.Avalanche]: avalancheChainId,
  [SupportedZapperNetworksEnum.BinanceSmartChain]: bscChainId,
  [SupportedZapperNetworksEnum.Ethereum]: ethChainId,
  [SupportedZapperNetworksEnum.Optimism]: optimismChainId,
}

export const CHAIN_ID_TO_ZAPPER_NETWORK_MAP = invertBy(ZAPPER_NETWORKS_TO_CHAIN_ID_MAP)

export const zapperNetworkToChainId = (network: SupportedZapperNetworksEnum): ChainId | undefined =>
  ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToZapperNetwork = (chainId: ChainId): SupportedZapperNetworksEnum | undefined =>
  CHAIN_ID_TO_ZAPPER_NETWORK_MAP[chainId]

const ZapperDisplayProps = z.object({
  label: z.string(),
  images: z.array(z.string()),
  statsItems: z.array(
    z.object({
      label: z.string(),
      value: z.union([
        z.object({
          type: z.string(),
          value: z.union([z.number(), z.string()]),
        }),
        z.string(),
        z.number(),
      ]),
    }),
  ),
  tertiaryLabel: z.string(),
  secondaryLabel: z.string(),
})

const ZapperAsset = z.object({
  key: z.string(),
  type: z.string(),
  appId: z.string(),
  groupId: z.string(),
  network: SupportedZapperNetworks,
  address: z.string(),
  price: z.number(),
  supply: z.number(),
  symbol: z.string(),
  dataProps: z.object({
    apy: z.number(),
    fee: z.number(),
    volume: z.number(),
    reserves: z.array(z.number(), z.number()),
    liquidity: z.number(),
  }),
  displayProps: ZapperDisplayProps,
  pricePerShare: z.array(z.union([z.string(), z.number()])),
  tokens: z.array(
    z.object({
      network: SupportedZapperNetworks,
      address: z.string(),
      decimals: z.number(),
      symbol: z.string(),
      price: z.number(),
      balance: z.number(),
      balanceRaw: z.string(),
      balanceUSD: z.number(),
    }),
  ),
  balance: z.number(),
  balanceRaw: z.string(),
  balanceUSD: z.number(),
})

const V2BalancesAppsResponse = z.array(
  z.object({
    key: z.string(),
    address: z.string(),
    appId: z.string(),
    appName: z.string(),
    appImage: z.string(),
    network: SupportedZapperNetworks,
    updatedAt: z.string(),
    balanceUSD: z.number(),
    products: z.array(
      z.object({
        label: z.string(),
        assets: z.array(ZapperAsset),
        meta: z.array(z.any()),
      }),
    ),
  }),
)

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
    description: `Retrieve tokens for a given application`,
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
