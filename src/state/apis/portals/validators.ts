import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId } from '@shapeshiftoss/utils'
import { invert } from 'lodash'
import type { Infer, Type } from 'myzod'
import z from 'myzod'

// Redeclared here to make these two utils work in scripts
const isNonEmpty = (x: string | any[] | Set<any>) => {
  // Array.prototype.length || String.prototype.length for arrays and strings
  if (typeof x === 'string' || Array.isArray(x)) {
    return Boolean(x.length)
  }
  // Set.prototype.size for sets
  if (x instanceof Set) {
    return Boolean(x.size)
  }
  return false
}
const isUrl = (x: string) => {
  try {
    new URL(x)
    return true
  } catch {
    return false
  }
}

export enum SupportedPortalsNetwork {
  Avalanche = 'avalanche',
  BinanceSmartChain = 'bsc',
  Ethereum = 'ethereum',
  Optimism = 'optimism',
  Polygon = 'polygon',
  Gnosis = 'gnosis',
  Arbitrum = 'arbitrum',
  Base = 'base',
}

export const PORTALS_NETWORKS_TO_CHAIN_ID_MAP: Record<SupportedPortalsNetwork, ChainId> = {
  [SupportedPortalsNetwork.Avalanche]: avalancheChainId,
  [SupportedPortalsNetwork.BinanceSmartChain]: bscChainId,
  [SupportedPortalsNetwork.Ethereum]: ethChainId,
  [SupportedPortalsNetwork.Optimism]: optimismChainId,
  [SupportedPortalsNetwork.Polygon]: polygonChainId,
  [SupportedPortalsNetwork.Gnosis]: gnosisChainId,
  [SupportedPortalsNetwork.Arbitrum]: arbitrumChainId,
  [SupportedPortalsNetwork.Base]: baseChainId,
} as const

export const CHAIN_ID_TO_PORTALS_NETWORK_MAP = invert(PORTALS_NETWORKS_TO_CHAIN_ID_MAP) as Partial<
  Record<ChainId, SupportedPortalsNetwork>
>

export const portalsNetworkToChainId = (network: SupportedPortalsNetwork): ChainId | undefined =>
  PORTALS_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToPortalsNetwork = (chainId: ChainId): SupportedPortalsNetwork | undefined =>
  CHAIN_ID_TO_PORTALS_NETWORK_MAP[chainId]

const SupportedPortalsNetworks = z.enum(SupportedPortalsNetwork)

const PortalsAppIdSchema = z.string()
const PortalsDisplayValue = z.union([
  z.object({
    type: z.string(),
    value: z.union([z.number(), z.string(), z.undefined()]),
  }),
  z.string(),
  z.number(),
])

// optional/nullable somehow doesn't work with z.lazy() so we union undefined the schema itself
const PortalsDisplayPropsSchema = z.union([
  z.object({
    label: z.string(),
    images: z.array(z.string()),
    statsItems: z
      .array(
        z.object({
          label: z.string(),
          value: PortalsDisplayValue,
        }),
      )
      .nullable()
      .optional(),
    secondaryLabel: PortalsDisplayValue.optional(),
    tertiaryLabel: PortalsDisplayValue.optional(),
    balanceDisplayMode: z.string().optional(),
    labelDetailed: z.string().optional(),
  }),
  z.undefined(),
])

// optional/nullable somehow doesn't work with z.lazy() so we union undefined the schema itself
const PortalsDataPropsSchema = z.union([
  z.object(
    {
      apy: z.number().optional(),
      isActive: z.boolean().optional(),
      isDebt: z.boolean().optional(),
      exchangeable: z.boolean().optional(),
      exchangeRate: z.number().optional(),
      fee: z.number().optional(),
      volume: z.number().optional(),
      // Realistically a z.tuple() of 1/2 assets, but you never know
      reserves: z.array(z.number()).optional(),
      liquidity: z.number().optional(),
      poolIndex: z.number().optional(),
      positionKey: z.string().optional(),
      extraRewarderAddress: z.string().optional(),
      swapAddress: z.string().optional(),
      symbol: z.string().optional(),
      weight: z.array(z.number()).optional(),
    },
    { allowUnknown: true },
  ),
  z.undefined(),
])

// Redeclared as a type since we lose type inference on the type below because of z.lazy() recursion
type PortalsToken = {
  type: 'base-token' | 'app-token'
  metaType?: 'claimable' | 'supplied' | 'borrowed'
  network: SupportedPortalsNetwork
  key?: string
  appId?: string
  address: string
  price?: number
  supply?: number
  symbol: string
  decimals: string | number
  dataProps?: Infer<typeof PortalsDataPropsSchema>
  displayProps?: Infer<typeof PortalsDisplayPropsSchema>
  pricePerShare?: (string | number)[]
  tokens?: PortalsToken[]
  balanceUSD?: number
  balance?: number
  balanceRaw?: string
}

const PortalsTokenSchema: Type<PortalsToken> = z
  .object({
    type: z.literals('base-token', 'app-token'),
    network: SupportedPortalsNetworks,
    address: z.string(),
    decimals: z.union([z.string(), z.number()]),
    symbol: z.string(),
    price: z.number(),
    metaType: z.literals('claimable', 'supplied', 'borrowed').optional(),
    balance: z.number().optional(),
    balanceRaw: z.string().optional(),
    balanceUSD: z.number().optional(),
    key: z.string().optional(),
    appId: PortalsAppIdSchema.optional(),
    supply: z.number().optional(),
    dataProps: PortalsDataPropsSchema.optional(),
    displayProps: PortalsDisplayPropsSchema.optional(),
    pricePerShare: z.array(z.union([z.string(), z.number()])).optional(),
    // Note, we lose tsc validation here but this *does* validate at runtime
    // https://github.com/davidmdm/myzod#lazy
    tokens: z.array(z.lazy(() => PortalsTokenSchema)).optional(),
  })
  .allowUnknownKeys()

const PortalsAssetBaseSchema = z
  .object({
    key: z.string(),
    type: z.string(),
    appId: PortalsAppIdSchema,
    network: SupportedPortalsNetworks,
    address: z.string(),
    price: z.number().optional(),
    supply: z.number().optional(),
    symbol: z.string().optional(),
    decimals: z.union([z.number(), z.string()]).optional(),
    dataProps: PortalsDataPropsSchema.optional(),
    displayProps: PortalsDisplayPropsSchema.optional(),
    pricePerShare: z.array(z.union([z.string(), z.number()])).optional(),
    tokens: z.array(PortalsTokenSchema).optional(),
    balance: z.number().optional(),
    balanceRaw: z.string().optional(),
    balanceUSD: z.number().optional(),
  })
  .allowUnknownKeys()

const PortalsAssetWithBalancesSchema = z
  .intersection(
    PortalsAssetBaseSchema,
    z.object({
      tokens: z.array(PortalsTokenSchema),
    }),
  )
  .allowUnknownKeys()

export type PortalsAssetWithBalancesType = Infer<typeof PortalsAssetWithBalancesSchema>

export const portalsAssetToMaybeAssetId = (
  asset: PortalsAssetWithBalancesType | PortalsToken,
): AssetId | undefined => {
  const chainId = portalsNetworkToChainId(asset.network as SupportedPortalsNetwork)
  if (!chainId) return undefined
  const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: asset.address,
  })

  return assetId
}

const PortalsProductSchema = z.object({
  label: z.string(),
  assets: z.array(PortalsAssetWithBalancesSchema),
  meta: z.array(z.unknown()),
})

const PortalsV2AppBalance = z.object({
  key: z.string(),
  address: z.string(),
  appId: PortalsAppIdSchema,
  appName: z.string(),
  appImage: z.string(),
  network: SupportedPortalsNetworks,
  updatedAt: z.string(),
  balanceUSD: z.number(),
  products: z.array(PortalsProductSchema),
})

const MEDIA_FILETYPE = ['mp4', 'png', 'jpeg', 'jpg', 'gif', 'svg', 'webp'] as const
export type MediaFileType = (typeof MEDIA_FILETYPE)[number]
export type MediaType = 'video' | 'image'

export const getMediaFileType = (mediaUrl: string | undefined): MediaFileType | undefined => {
  if (!mediaUrl) return undefined
  const mediaFiletype = mediaUrl.split('.').pop()
  return mediaFiletype as MediaFileType | undefined
}

export const getMediaType = (mediaUrl: string | undefined): MediaType | undefined => {
  const mediaFileType = getMediaFileType(mediaUrl)
  if (!mediaFileType) return undefined

  if (mediaFileType === 'mp4') return 'video'
  return 'image'
}

const mediaSchema = z.object({
  type: z.string(),
  originalUrl: z
    .string()
    .withPredicate(isUrl)
    .withPredicate(url => {
      const mediaFileType = getMediaFileType(url)
      if (!mediaFileType) return false
      return MEDIA_FILETYPE.includes(mediaFileType as MediaFileType)
    }, 'Media filetype not supported'),
})

export type MediaUrl = Infer<typeof mediaSchema>

const socialLinkSchema = z.object({
  name: z.string(),
  label: z.string(),
  url: z.string().withPredicate(isUrl),
  logoUrl: z.string(),
})

const statsSchema = z.object({
  hourlyVolumeEth: z.number(),
  hourlyVolumeEthPercentChange: z.number().nullable(),
  dailyVolumeEth: z.number(),
  dailyVolumeEthPercentChange: z.number().nullable(),
  weeklyVolumeEth: z.number(),
  weeklyVolumeEthPercentChange: z.number().nullable(),
  monthlyVolumeEth: z.number(),
  monthlyVolumeEthPercentChange: z.number().nullable(),
  totalVolumeEth: z.number(),
})

const fullCollectionSchema = z.object({
  name: z.string(),
  network: z.string(),
  description: z.string(),
  logoImageUrl: z.string().nullable(),
  cardImageUrl: z.string().nullable(),
  bannerImageUrl: z.string().nullable(),
  nftStandard: z.string(),
  floorPriceEth: z.string().nullable(),
  marketCap: z.string().optional(),
  openseaId: z.string().nullable(),
  socialLinks: z.array(socialLinkSchema),
  stats: statsSchema,
  type: z.string(),
})

const nftCollectionSchema = z.object({
  balance: z.string(),
  balanceUSD: z.string(),
  collection: fullCollectionSchema,
})

const cursorSchema = z.string().withPredicate(isNonEmpty)

const v2NftBalancesCollectionsSchema = z.object({
  items: z.array(nftCollectionSchema),
  cursor: cursorSchema.optional(),
})

const optionalUrl = z.union([z.string().withPredicate(isUrl).optional().nullable(), z.literal('')])

const collectionSchema = z.object({
  address: z.string(),
  network: z.string(),
  name: z.string().optional(),
  nftStandard: z.string().withPredicate(isNonEmpty),
  type: z.string(),
  floorPriceEth: z.string().nullable(),
  logoImageUrl: optionalUrl,
  openseaId: z.string().nullable(),
})

const tokenSchema = z.object({
  id: z.string().withPredicate(isNonEmpty),
  name: z.string().withPredicate(isNonEmpty),
  tokenId: z.string().withPredicate(isNonEmpty),
  lastSaleEth: z.string().nullable(),
  rarityRank: z.number().nullable(),
  estimatedValueEth: z.number().nullable(),
  medias: z.array(mediaSchema),
  collection: collectionSchema,
})

const userNftItemSchema = z.object({
  balance: z.string().withPredicate(isNonEmpty),
  token: tokenSchema,
})

const userNftTokenSchema = z.object({
  cursor: cursorSchema.optional(),
  items: z.array(userNftItemSchema).optional(),
})

const categorySchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
  })
  .allowUnknownKeys()

export type V2NftUserItem = Infer<typeof userNftItemSchema>

export type V2BalancesAppsResponseType = Infer<typeof V2BalancesAppsResponse>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const V2BalancesAppsResponse = z.array(PortalsV2AppBalance)

export type PortalsAssetBase = Infer<typeof PortalsAssetBaseSchema>
export const V2AppTokensResponse = z.array(PortalsAssetBaseSchema)
export type V2AppTokensResponseType = Infer<typeof V2AppTokensResponse>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const V2NftUserTokensResponse = userNftTokenSchema
export type V2NftUserTokensResponseType = Infer<typeof V2NftUserTokensResponse>

export type V2NftCollectionType = Infer<typeof nftCollectionSchema>

export const V2NftBalancesCollectionsResponse = v2NftBalancesCollectionsSchema
export type V2NftBalancesCollectionsResponseType = Infer<typeof V2NftBalancesCollectionsResponse>

export type V2PortalsNft = Infer<typeof tokenSchema>

export const V2AppsBalancesResponse = z.array(
  z.object({
    key: z.string(),
    address: z.string(),
    appId: PortalsAppIdSchema.optional(),
    appName: z.string(),
    appImage: z.string(),
    network: z.string(),
    updatedAt: z.string(),
    balanceUSD: z.number(),
    products: z.array(PortalsProductSchema),
  }),
)
export type V2AppsBalancesResponseType = Infer<typeof V2AppsBalancesResponse>

const V2AppTokenResponse = z.object({
  address: z.string(),
  network: z.string(),
})

const V2AppGroupResponse = z.object({
  type: z.string(),
  id: z.string(),
  label: z.string().optional(),
  isHiddenFromExplore: z.boolean(),
})

const V2AppResponse = z
  .object({
    id: z.string(),
    category: categorySchema.nullable().optional(),
    slug: z.string(),
    name: z.string(),
    imgUrl: z.string(),
    twitterUrl: z.string().nullable(),
    farcasterUrl: z.string().nullable(),
    tags: z.array(z.string()),
    token: V2AppTokenResponse.nullable(),
    groups: z.array(V2AppGroupResponse),
  })
  .allowUnknownKeys()

export const V2AppsResponse = z.array(V2AppResponse)
export type V2AppResponseType = Infer<typeof V2AppResponse>
