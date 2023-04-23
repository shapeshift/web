import type { ChainId } from '@shapeshiftoss/caip'
import { avalancheChainId, bscChainId, ethChainId, optimismChainId } from '@shapeshiftoss/caip'
import { invert } from 'lodash'
import type { Infer } from 'myzod'
import z from 'myzod'
import { isNonEmpty, isUrl } from 'lib/utils'

export enum SupportedZapperNetwork {
  Avalanche = 'avalanche',
  BinanceSmartChain = 'binance-smart-chain',
  Ethereum = 'ethereum',
  Optimism = 'optimism',
  // Polygon = 'polygon',
  // Gnosis = 'gnosis',
  // Fantom = 'fantom',
  // Artbitrum = 'arbitrum',
  // Celo = 'celo',
  // Harmony = 'harmony',
  // Moonriver = 'moonriver',
  // Bitcoin = 'bitcoin', "supported" by zapper but actually not anymore
  // Cronos = 'cronos',
  // Aurora = 'aurora',
  // Evmos = 'evmos',
}

export const ZAPPER_NETWORKS_TO_CHAIN_ID_MAP: Record<SupportedZapperNetwork, ChainId> = {
  [SupportedZapperNetwork.Avalanche]: avalancheChainId,
  [SupportedZapperNetwork.BinanceSmartChain]: bscChainId,
  [SupportedZapperNetwork.Ethereum]: ethChainId,
  [SupportedZapperNetwork.Optimism]: optimismChainId,
} as const

export const CHAIN_ID_TO_ZAPPER_NETWORK_MAP = invert(ZAPPER_NETWORKS_TO_CHAIN_ID_MAP) as Partial<
  Record<ChainId, SupportedZapperNetwork>
>

export const zapperNetworkToChainId = (network: SupportedZapperNetwork): ChainId | undefined =>
  ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[network]

export const chainIdToZapperNetwork = (chainId: ChainId): SupportedZapperNetwork | undefined =>
  CHAIN_ID_TO_ZAPPER_NETWORK_MAP[chainId]

const SupportedZapperNetworks = z.enum(SupportedZapperNetwork)

export enum ZapperAppId {
  AaveAmm = 'aave-amm',
  AaveSafetyModule = 'aave-safety-module',
  AaveV1 = 'aave-v1',
  AaveV2 = 'aave-v2',
  AaveV3 = 'aave-v3',
  Aavegotchi = 'aavegotchi',
  Abracadabra = 'abracadabra',
  Across = 'across',
  Adamant = 'adamant',
  Aelin = 'aelin',
  Agave = 'agave',
  Airswap = 'airswap',
  Alchemix = 'alchemix',
  AlchemixV2 = 'alchemix-v2',
  Alkemi = 'alkemi',
  AlphaTokenomics = 'alpha-tokenomics',
  AlphaV1 = 'alpha-v1',
  Amp = 'amp',
  Ampleforth = 'ampleforth',
  Angle = 'angle',
  ApeTax = 'ape-tax',
  Apecoin = 'apecoin',
  Apeswap = 'apeswap',
  Api3 = 'api3',
  Apy = 'apy',
  ArbitrumBridge = 'arbitrum-bridge',
  ArborFinance = 'arbor-finance',
  Arcade = 'arcade',
  Arcx = 'arcx',
  Armor = 'armor',
  Arrakis = 'arrakis',
  ArtGobblers = 'art-gobblers',
  Arth = 'arth',
  AtlendisV1 = 'atlendis-v1',
  Augur = 'augur',
  Aura = 'aura',
  Aurigami = 'aurigami',
  AuroraPlus = 'aurora-plus',
  Autofarm = 'autofarm',
  Aztec = 'aztec',
  BProtocol = 'b-protocol',
  Badger = 'badger',
  BalancerV1 = 'balancer-v1',
  BalancerV2 = 'balancer-v2',
  Banano = 'banano',
  Bancor = 'bancor',
  BancorV3 = 'bancor-v3',
  Bao = 'bao',
  Barnbridge = 'barnbridge',
  BarnbridgeSmartAlpha = 'barnbridge-smart-alpha',
  BarnbridgeSmartYield = 'barnbridge-smart-yield',
  BarnbridgeV2 = 'barnbridge-v2',
  BasketDao = 'basket-dao',
  BastionProtocol = 'bastion-protocol',
  Beanstalk = 'beanstalk',
  Beefy = 'beefy',
  BeethovenX = 'beethoven-x',
  Belt = 'belt',
  Benchmark = 'benchmark',
  BendDao = 'bend-dao',
  Benqi = 'benqi',
  Bent = 'bent',
  BigData = 'big-data',
  Biswap = 'biswap',
  Bluebit = 'bluebit',
  Blur = 'blur',
  Botto = 'botto',
  Camelot = 'camelot',
  CaskProtocol = 'cask-protocol',
  Chainlink = 'chainlink',
  ChecksVvOriginals = 'checks-vv-originals',
  ChickenBond = 'chicken-bond',
  Circle = 'circle',
  Clearpool = 'clearpool',
  Clever = 'clever',
  Comethswap = 'comethswap',
  Compound = 'compound',
  CompoundV3 = 'compound-v3',
  Concave = 'concave',
  Concentrator = 'concentrator',
  ConicFinance = 'conic-finance',
  Convex = 'convex',
  ConvexFrax = 'convex-frax',
  CozyFinance = 'cozy-finance',
  Cream = 'cream',
  Cryptex = 'cryptex',
  CryptoPunks = 'crypto-punks',
  Curve = 'curve',
  DefiSwap = 'defi-swap',
  Defiedge = 'defiedge',
  Defisaver = 'defisaver',
  DelegateCash = 'delegate-cash',
  Derivadex = 'derivadex',
  DfiMoney = 'dfi-money',
  Dforce = 'dforce',
  Dfx = 'dfx',
  Dfyn = 'dfyn',
  Dhedge = 'dhedge',
  DhedgeV2 = 'dhedge-v2',
  Dodo = 'dodo',
  Doodles = 'doodles',
  Dopex = 'dopex',
  Drops = 'drops',
  Dystopia = 'dystopia',
  Ease = 'ease',
  Eden = 'eden',
  EightyEightMph = 'eighty-eight-mph',
  EightyEightMphV3 = 'eighty-eight-mph-v3',
  Element = 'element',
  Ellipsis = 'ellipsis',
  Ens = 'ens',
  EnzymeFinance = 'enzyme-finance',
  Epns = 'epns',
  Essentia = 'essentia',
  EthereumStaking = 'ethereum-staking',
  Euler = 'euler',
  Exactly = 'exactly',
  Fei = 'fei',
  FirebirdFinance = 'firebird-finance',
  FixedForex = 'fixed-forex',
  FloatCapital = 'float-capital',
  FloatProtocol = 'float-protocol',
  FloorDao = 'floor-dao',
  Foundation = 'foundation',
  Frax = 'frax',
  FraxLend = 'frax-lend',
  FraxSwap = 'frax-swap',
  Furucombo = 'furucombo',
  Futureswap = 'futureswap',
  GainsNetwork = 'gains-network',
  GammaStrategies = 'gamma-strategies',
  Gearbox = 'gearbox',
  Geist = 'geist',
  Gem = 'gem',
  Generic = 'generic',
  Genie = 'genie',
  Gmx = 'gmx',
  Goldfinch = 'goldfinch',
  GranaryFinance = 'granary-finance',
  GravityBridge = 'gravity-bridge',
  Grim = 'grim',
  Gro = 'gro',
  Hakuswap = 'hakuswap',
  Halofi = 'halofi',
  Harvest = 'harvest',
  HectorNetwork = 'hector-network',
  Hedgefarm = 'hedgefarm',
  Hegic = 'hegic',
  Helio = 'helio',
  Hex = 'hex',
  HomoraV2 = 'homora-v2',
  Honeyswap = 'honeyswap',
  Hop = 'hop',
  HundredFinance = 'hundred-finance',
  Idle = 'idle',
  Illuvium = 'illuvium',
  ImmutableXBridge = 'immutable-x-bridge',
  Impermax = 'impermax',
  ImpossibleFinance = 'impossible-finance',
  IndexCoop = 'index-coop',
  Indexed = 'indexed',
  Instadapp = 'instadapp',
  Insurace = 'insurace',
  Inverse = 'inverse',
  InverseFirm = 'inverse-firm',
  IporProtocol = 'ipor-protocol',
  Iq = 'iq',
  Iron = 'iron',
  IronBank = 'iron-bank',
  Jarvis = 'jarvis',
  JonesDao = 'jones-dao',
  Jpegd = 'jpegd',
  KeepNetwork = 'keep-network',
  Keeper = 'keeper',
  Klima = 'klima',
  KnownOrigin = 'known-origin',
  Kogefarm = 'kogefarm',
  Koyo = 'koyo',
  Kwenta = 'kwenta',
  KyberDao = 'kyber-dao',
  KyberswapClassic = 'kyberswap-classic',
  KyberswapElastic = 'kyberswap-elastic',
  Launchpool = 'launchpool',
  LemmaFinance = 'lemma-finance',
  Lido = 'lido',
  Liquiddriver = 'liquiddriver',
  Liquity = 'liquity',
  LlamaAirforce = 'llama-airforce',
  Llamapay = 'llamapay',
  LooksRare = 'looks-rare',
  LsdProtocol = 'lsd-protocol',
  Lydia = 'lydia',
  Lyra = 'lyra',
  LyraAvalon = 'lyra-avalon',
  LyraNewport = 'lyra-newport',
  Mahadao = 'mahadao',
  Maker = 'maker',
  Manifold = 'manifold',
  ManifoldFinance = 'manifold-finance',
  Maple = 'maple',
  MarketXyz = 'market-xyz',
  MeanFinance = 'mean-finance',
  MeritCircle = 'merit-circle',
  Meshswap = 'meshswap',
  Metacade = 'metacade',
  Metamask = 'metamask',
  MetavaultTrade = 'metavault-trade',
  Midas = 'midas',
  Mirror = 'mirror',
  Moonbirds = 'moonbirds',
  Moonrock = 'moonrock',
  Morpho = 'morpho',
  Mstable = 'mstable',
  Multichain = 'multichain',
  MummyFinance = 'mummy-finance',
  Mux = 'mux',
  Mycelium = 'mycelium',
  NereusFinance = 'nereus-finance',
  NexusMutual = 'nexus-mutual',
  Nft20 = 'nft20',
  NftWorlds = 'nft-worlds',
  Nftfi = 'nftfi',
  Nftx = 'nftx',
  NotionalFinance = 'notional-finance',
  NounsBuilder = 'nouns-builder',
  Olympus = 'olympus',
  Ondo = 'ondo',
  OneInch = 'one-inch',
  Onx = 'onx',
  Ooki = 'ooki',
  OpenOcean = 'openOcean',
  Openleverage = 'openleverage',
  Opensea = 'opensea',
  OpiumNetwork = 'opium-network',
  Origin = 'origin',
  OriginDollarGovernance = 'origin-dollar-governance',
  OriginStory = 'origin-story',
  OrionProtocol = 'orion-protocol',
  Otterclam = 'otterclam',
  PStake = 'p-stake',
  Pancakeswap = 'pancakeswap',
  Pangolin = 'pangolin',
  ParaSpace = 'para-space',
  Parallel = 'parallel',
  Paraswap = 'paraswap',
  Pendle = 'pendle',
  PendleV2 = 'pendle-v2',
  Penguin = 'penguin',
  PerpetualProtocol = 'perpetual-protocol',
  Phuture = 'phuture',
  Pickle = 'pickle',
  PieDao = 'pie-dao',
  PikaProtocol = 'pika-protocol',
  PikaProtocolV3 = 'pika-protocol-v3',
  Pirex = 'pirex',
  PixelmonTrainerAdventure = 'pixelmon-trainer-adventure',
  PlatypusFinance = 'platypus-finance',
  Plutus = 'plutus',
  Pnetwork = 'pnetwork',
  PodsYield = 'pods-yield',
  PolygonBridge = 'polygon-bridge',
  PolygonStaking = 'polygon-staking',
  Polynomial = 'polynomial',
  PoolTogetherV3 = 'pool-together-v3',
  PoolTogetherV4 = 'pool-together-v4',
  Popsicle = 'popsicle',
  Powerpool = 'powerpool',
  Premia = 'premia',
  QiDao = 'qi-dao',
  Quickswap = 'quickswap',
  Quix = 'quix',
  RadiantCapital = 'radiant-capital',
  RadiantV2 = 'radiant-v2',
  Railgun = 'railgun',
  Rally = 'rally',
  Ramses = 'ramses',
  Rari = 'rari',
  RariFuse = 'rari-fuse',
  Realt = 'realt',
  RealtRmm = 'realt-rmm',
  Reaper = 'reaper',
  RedactedCartel = 'redacted-cartel',
  Reflexer = 'reflexer',
  Ren = 'ren',
  RevertFinance = 'revert-finance',
  RhinoFi = 'rhino-fi',
  Ribbon = 'ribbon',
  RibbonLend = 'ribbon-lend',
  RibbonV2 = 'ribbon-v2',
  RoboVault = 'robo-vault',
  RocketPool = 'rocket-pool',
  RoninBridge = 'ronin-bridge',
  Rook = 'rook',
  Rubicon = 'rubicon',
  Sablier = 'sablier',
  Saddle = 'saddle',
  Scream = 'scream',
  ScreamV2 = 'scream-v2',
  Shapeshift = 'shapeshift',
  SharedStake = 'shared-stake',
  Shell = 'shell',
  ShellV2 = 'shell-v2',
  ShibaSwap = 'shiba-swap',
  Sideshift = 'sideshift',
  SiloFinance = 'silo-finance',
  SingularityDao = 'singularity-dao',
  Smoothy = 'smoothy',
  Snowball = 'snowball',
  Socket = 'socket',
  Solace = 'solace',
  Solarbeam = 'solarbeam',
  SolidLizard = 'solid-lizard',
  Solidex = 'solidex',
  Solidly = 'solidly',
  SongADay = 'song-a-day',
  Sonne = 'sonne',
  Spartacus = 'spartacus',
  Spiritswap = 'spiritswap',
  Spookyswap = 'spookyswap',
  Spool = 'spool',
  StakeDao = 'stake-dao',
  Stakefish = 'stakefish',
  Stakewise = 'stakewise',
  Stargate = 'stargate',
  SteakHut = 'steak-hut',
  Stratos = 'stratos',
  Strike = 'strike',
  Strongblock = 'strongblock',
  Sturdy = 'sturdy',
  Sudoswap = 'sudoswap',
  Superfluid = 'superfluid',
  Superrare = 'superrare',
  Sushiswap = 'sushiswap',
  SushiswapBentobox = 'sushiswap-bentobox',
  SushiswapKashi = 'sushiswap-kashi',
  Swapr = 'swapr',
  Swerve = 'swerve',
  Symphony = 'symphony',
  Synapse = 'synapse',
  Synthetix = 'synthetix',
  Tarot = 'tarot',
  Teahouse = 'teahouse',
  TeddyCash = 'teddy-cash',
  Tempus = 'tempus',
  Tenderize = 'tenderize',
  Tessera = 'tessera',
  TestApp = 'test-app',
  Thales = 'thales',
  TheGraph = 'the-graph',
  Tokemak = 'tokemak',
  Tokenlon = 'tokenlon',
  Tokens = 'tokens',
  Tokensets = 'tokensets',
  Tomb = 'tomb',
  TornadoCash = 'tornado-cash',
  TraderJoe = 'trader-joe',
  TraderJoeBanker = 'trader-joe-banker',
  TraderJoeV2 = 'trader-joe-v2',
  Trisolaris = 'trisolaris',
  Trove = 'trove',
  Truefi = 'truefi',
  Ubeswap = 'ubeswap',
  UmamiFinance = 'umami-finance',
  Unagii = 'unagii',
  Union = 'union',
  Unipilot = 'unipilot',
  UniswapV1 = 'uniswap-v1',
  UniswapV2 = 'uniswap-v2',
  UniswapV3 = 'uniswap-v3',
  Universe = 'universe',
  UnlockdFinance = 'unlockd-finance',
  Unsheth = 'unsheth',
  Unstoppable = 'unstoppable',
  UwuLend = 'uwu-lend',
  Vader = 'vader',
  VaporwaveFinance = 'vaporwave-finance',
  VectorFinance = 'vector-finance',
  Vela = 'vela',
  Velodrome = 'velodrome',
  VendorFinance = 'vendor-finance',
  Venus = 'venus',
  Vesper = 'vesper',
  VestaFinance = 'vesta-finance',
  Visor = 'visor',
  Votium = 'votium',
  Wepiggy = 'wepiggy',
  WolfGame = 'wolf-game',
  WombatExchange = 'wombat-exchange',
  Wonderland = 'wonderland',
  X2y2 = 'x2y2',
  Yaxis = 'yaxis',
  Yearn = 'yearn',
  YieldProtocol = 'yield-protocol',
  YieldYak = 'yield-yak',
  Zapper = 'zapper',
  ZeroVix = 'zero-vix',
  ZeroX = 'zero-x',
  ZipSwap = 'zip-swap',
  ZksyncBridge = 'zksync-bridge',
  Zora = 'zora',
}

const ZapperAppIdSchema = z.enum(ZapperAppId)
const ZapperDisplayValue = z.union([
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
      value: ZapperDisplayValue,
    }),
  ),
  secondaryLabel: ZapperDisplayValue.optional(),
  tertiaryLabel: ZapperDisplayValue.optional(),
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
  reserves: z.tuple([z.number(), z.number()]),
  liquidity: z.number(),
})

const ZapperAssetBaseSchema = z.object({
  key: z.string(),
  type: z.string(),
  appId: ZapperAppIdSchema,
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

// const GasPricesResponse = z.object({
// standard: z.object({}).partial(),
// fast: z.object({}).partial(),
// instant: z.object({}).partial(),
// eip1559: z.boolean(),
// })

const ZapperProductSchema = z.object({
  label: z.string(),
  assets: z.array(z.union([ZapperAssetBaseSchema, ZapperAssetWithBalancesSchema])),
  meta: z.array(z.unknown()),
})

const ZapperV2AppBalance = z.object({
  key: z.string(),
  address: z.string(),
  appId: ZapperAppIdSchema,
  appName: z.string(),
  appImage: z.string(),
  network: SupportedZapperNetworks,
  updatedAt: z.string(),
  balanceUSD: z.number(),
  products: z.array(ZapperProductSchema),
})

export enum ZapperGroupId {
  Pool = 'pool',
  Farm = 'farm',
}

const MEDIA_FILETYPE = ['mp4', 'png', 'jpeg', 'jpg', 'gif', 'svg', 'webp'] as const
export type MediaFileType = typeof MEDIA_FILETYPE[number]
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
  address: z.string().optional(),
  network: z.string().optional(),
  name: z.string().optional(),
  nftStandard: z.string().withPredicate(isNonEmpty),
  type: z.string().optional(),
  floorPriceEth: z.string().optional().nullable(),
  logoImageUrl: optionalUrl,
  openseaId: z.string().optional().nullable(),
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

// const ZapperGroupIdSchema = z.nativeEnum(ZapperGroupId)

export type V2NftUserItem = Infer<typeof userNftItemSchema>

export type V2BalancesAppsResponseType = Infer<typeof V2BalancesAppsResponse>
const V2BalancesAppsResponse = z.array(ZapperV2AppBalance)

export type ZapperAssetBase = Infer<typeof ZapperAssetBaseSchema>
export const V2AppTokensResponse = z.array(ZapperAssetBaseSchema)
export type V2AppTokensResponseType = Infer<typeof V2AppTokensResponse>

const V2NftUserTokensResponse = userNftTokenSchema
export type V2NftUserTokensResponseType = Infer<typeof V2NftUserTokensResponse>

export type V2NftCollectionType = Infer<typeof nftCollectionSchema>

const V2NftBalancesCollectionsResponse = v2NftBalancesCollectionsSchema
export type V2NftBalancesCollectionsResponseType = Infer<typeof V2NftBalancesCollectionsResponse>

export type V2ZapperNft = Infer<typeof tokenSchema>

// Legacy of using zodios, not consumed anymore but kept as API reference
// const endpoints = [
// {
// method: 'get',
// path: '/v2/api-clients/points',
// description: `Get stats about the API client points`,
// requestFormat: 'json',
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/apps',
// requestFormat: 'json',
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/apps/:appSlug',
// requestFormat: 'json',
// parameters: [
// {
// name: 'appSlug',
// type: 'Path',
// schema: z.string(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/apps/:appSlug/balances',
// requestFormat: 'json',
// parameters: [
// {
// name: 'appSlug',
// type: 'Path',
// schema: z.string(),
// },
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/apps/:appSlug/positions',
// description: `Retrieve positions (non-tokenized) for a given application`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'appSlug',
// type: 'Path',
// schema: z.string(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks,
// },
// {
// name: 'groupId',
// type: 'Query',
// schema: z.string(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/apps/:appSlug/tokens',
// alias: 'getV2AppTokens',
// description: `Retrieve tokens for a given application`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'appSlug',
// type: 'Path',
// schema: z.string(),
// },
// {
// name: 'networks',
// type: 'Query',
// schema: z.array(SupportedZapperNetworks.optional()),
// },
// {
// name: 'groupId',
// type: 'Query',
// schema: ZapperGroupIdSchema,
// },
// ],
// response: V2AppTokensResponse,
// },
// {
// method: 'get',
// path: '/v2/balances/apps',
// description: `Gets the app balances for a set of addresses and set of networks.`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'networks',
// type: 'Query',
// schema: z.array(SupportedZapperNetworks.optional()),
// },
// ],
// response: V2BalancesAppsResponse,
// },
// {
// method: 'post',
// path: '/v2/balances/apps',
// description: `Recomputes the app balances for a set of addresses and set of networks.`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'networks',
// type: 'Query',
// schema: z.array(SupportedZapperNetworks.optional()),
// },
// ],
// response: z.object({
// jobId: z.string(),
// }),
// },
// {
// method: 'get',
// path: '/v2/balances/job-status',
// description: `Gets the status of a single balance computation job.`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'jobId',
// type: 'Query',
// schema: z.string(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/balances/tokens',
// description: `Gets the token balances for a set of addresses and set of networks.`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'networks[]',
// type: 'Query',
// schema: z.array(SupportedZapperNetworks).optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'post',
// path: '/v2/balances/tokens',
// description: `Recomputes the token balances for a set of addresses and set of networks.`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'networks[]',
// type: 'Query',
// schema: z.array(SupportedZapperNetworks).optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/exchange/price',
// description: `Returns data about the amount received if a trade would be made. **Should be called whenever a price needs to be calculated.**`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'gasPrice',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'maxFeePerGas',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'maxPriorityFeePerGas',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'sellTokenAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'buyTokenAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'sellAmount',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'buyAmount',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'ownerAddress',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'slippagePercentage',
// type: 'Query',
// schema: z.number().optional(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional().default(SupportedZapperNetwork.Ethereum),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/exchange/quote',
// description: `Returns both the relative price for a trade as well as the call data used to sumbit a transaction for a trade. **Should only be called when a trade is ready to be submitted.**`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'gasPrice',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'maxFeePerGas',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'maxPriorityFeePerGas',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'sellTokenAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'buyTokenAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'sellAmount',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'buyAmount',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'ownerAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'slippagePercentage',
// type: 'Query',
// schema: z.number(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional().default(SupportedZapperNetwork.Ethereum),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/exchange/supported',
// description: `Returns the exchanges supported by Zapper API.`,
// requestFormat: 'json',
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/gas-prices',
// description: `Retrieve a gas price aggregated from multiple different sources`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional().default(SupportedZapperNetwork.Ethereum),
// },
// {
// name: 'eip1559',
// type: 'Query',
// schema: z.boolean(),
// },
// ],
// response: GasPricesResponse,
// },
// {
// method: 'get',
// path: '/v2/nft/balances/collections',
// alias: 'getV2NftBalancesCollections',
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'minCollectionValueUsd',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'search',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'collectionAddresses[]',
// type: 'Query',
// schema: z.array(z.string()).optional(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// {
// name: 'limit',
// type: 'Query',
// schema: z.string().optional().default('25'),
// },
// {
// name: 'cursor',
// type: 'Query',
// schema: z.string().optional(),
// },
// ],
// response: V2NftBalancesCollectionsResponse,
// },
// {
// method: 'get',
// path: '/v2/nft/balances/collections-totals',
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'minCollectionValueUsd',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'search',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'collectionAddresses[]',
// type: 'Query',
// schema: z.array(z.string()).optional(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/nft/balances/net-worth',
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/nft/balances/tokens',
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'minEstimatedValueUsd',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'search',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'collectionAddresses[]',
// type: 'Query',
// schema: z.array(z.string()).optional(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// {
// name: 'limit',
// type: 'Query',
// schema: z.string().optional().default('25'),
// },
// {
// name: 'cursor',
// type: 'Query',
// schema: z.string().optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/nft/balances/tokens-totals',
// requestFormat: 'json',
// parameters: [
// {
// name: 'addresses[]',
// type: 'Query',
// schema: z.array(z.string()),
// },
// {
// name: 'minEstimatedValueUsd',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'search',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'collectionAddresses[]',
// type: 'Query',
// schema: z.array(z.string()).optional(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/nft/collection/tokens',
// requestFormat: 'json',
// parameters: [
// {
// name: 'collectionAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks,
// },
// {
// name: 'cursor',
// type: 'Query',
// schema: z.string().optional(),
// },
// {
// name: 'tokenIds[]',
// type: 'Query',
// schema: z.array(z.string()).optional(),
// },
// ],
// response: z.void(),
// },
// {
// method: 'get',
// path: '/v2/nft/user/tokens',
// requestFormat: 'json',
// alias: 'getV2NftUserTokens',
// parameters: [
// {
// name: 'userAddress',
// type: 'Query',
// schema: z.string(),
// },
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// {
// name: 'limit',
// type: 'Query',
// schema: z.string().optional().default('50'),
// },
// {
// name: 'cursor',
// type: 'Query',
// schema: z.string().optional(),
// },
// ],
// response: V2NftUserTokensResponse,
// },
// {
// method: 'get',
// path: '/v2/prices',
// description: `Retrieve supported tokens and their prices`,
// requestFormat: 'json',
// parameters: [
// {
// name: 'network',
// type: 'Query',
// schema: SupportedZapperNetworks.optional(),
// },
// ],
// response: z.void(),
// },
// ]
