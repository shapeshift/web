import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromChainId,
  gnosisChainId,
  hyperEvmChainId,
  katanaChainId,
  ltcChainId,
  mayachainChainId,
  megaethChainId,
  monadChainId,
  nearChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  starknetChainId,
  suiChainId,
  thorchainChainId,
  tonChainId,
  tronChainId,
  zecChainId,
} from '@shapeshiftoss/caip'
import type { TransactionData } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'

export type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
export type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
export type { AssetId, ChainId }

export { erc20Abi as ERC20_ABI } from 'viem'

export enum SwapperName {
  NearIntents = 'NEAR Intents',
  Relay = 'Relay',
  Thorchain = 'THORChain',
  Mayachain = 'MAYAChain',
  //ArbitrumBridge = 'Arbitrum Bridge',
  //Avnu = 'AVNU',
  //Bebop = 'Bebop',
  //ButterSwap = 'ButterSwap',
  //Cetus = 'Cetus',
  //Chainflip = 'Chainflip',
  //CowSwap = 'CoW Swap',
  //Portals = 'Portals',
  //Sunio = 'Sun.io',
  //Zrx = '0x',
}

export type Chain = {
  chainId: ChainId
  name: string
  icon: string
  color: string
  nativeAssetId: AssetId
}

export type Asset = {
  assetId: AssetId
  chainId: ChainId
  symbol: string
  name: string
  precision: number
  icon?: string
  color?: string
  networkName?: string
  networkIcon?: string
  explorer?: string
  explorerTxLink?: string
  explorerAddressLink?: string
  relatedAssetKey?: AssetId | null
}

export type TradeQuoteStep = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  rate: string
  source: SwapperName
  feeData: {
    networkFeeCryptoBaseUnit: string
    protocolFees?: Record<AssetId, { amountCryptoBaseUnit: string }>
  }
  allowanceContract?: string
  estimatedExecutionTimeMs?: number
}

export type TradeQuote = {
  id: string
  rate: string
  swapperName: SwapperName
  steps: TradeQuoteStep[]
  receiveAddress: string
  partnerBps?: string
  shapeshiftBps: string
  affiliateBps: string
  slippageTolerancePercentageDecimal?: string
  isStreaming?: boolean
}

export type TradeRate = {
  swapperName: SwapperName
  rate: string
  buyAmountCryptoBaseUnit: string
  sellAmountCryptoBaseUnit: string
  steps: number
  estimatedExecutionTimeMs?: number
  partnerBps?: string
  shapeshiftBps: string
  affiliateBps: string
  networkFeeCryptoBaseUnit?: string
  error?: {
    code: string
    message: string
  }
  id?: string
}

export type ThemeMode = 'light' | 'dark'

export type ThemeConfig = {
  mode: ThemeMode
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  borderRadius?: string
  fontFamily?: string
  borderColor?: string
  secondaryTextColor?: string
  mutedTextColor?: string
  inputColor?: string
  hoverColor?: string
  buttonVariant?: 'filled' | 'outline'
}

export type SwapWidgetFilters = {
  allowedChainIds?: ChainId[]
  disabledChainIds?: ChainId[]
  allowedAssetIds?: AssetId[]
  disabledAssetIds?: AssetId[]
}

export type SwapWidgetProps = {
  partnerCode?: string
  apiBaseUrl?: string
  allowShapeshiftRedirect?: boolean
  defaultSellAsset?: Asset
  defaultBuyAsset?: Asset
  sellFilters?: SwapWidgetFilters
  buyFilters?: SwapWidgetFilters
  allowedSwapperNames?: SwapperName[]
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  theme?: ThemeMode | ThemeConfig
  defaultSlippage?: string
  showPoweredBy?: boolean
  showConnectButton?: boolean
  walletConnectProjectId?: string
  ratesRefetchInterval?: number
  isBuyAssetLocked?: boolean
}

export type RatesResponse = {
  rates: TradeRate[]
}

export type {
  CosmosTransactionData,
  EvmTransactionData,
  Permit2SignatureRequired,
  SolanaTransactionData,
  TransactionData,
  UtxoDepositTransactionData,
  UtxoPsbtTransactionData,
  UtxoTransactionData,
} from '@shapeshiftoss/types'

export type ApiQuoteStep = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  allowanceContract: string
  estimatedExecutionTimeMs: number | undefined
  source: string
  transactionData?: TransactionData
}

export type ApprovalInfo = {
  isRequired: boolean
  spender: string
  approvalTx?: {
    to: string
    data: string
    value: string
  }
}

export type QuoteResponse = {
  quoteId: string
  swapperName: SwapperName
  rate: string
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  partnerBps?: string
  shapeshiftBps: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string | undefined
  networkFeeCryptoBaseUnit: string | undefined
  steps: ApiQuoteStep[]
  approval: ApprovalInfo
  expiresAt: number
}

export type AssetsResponse = {
  byId: Record<AssetId, Asset>
  ids: AssetId[]
}

export const EVM_CHAIN_IDS = {
  ethereum: ethChainId,
  arbitrum: arbitrumChainId,
  optimism: optimismChainId,
  polygon: polygonChainId,
  base: baseChainId,
  avalanche: avalancheChainId,
  bsc: bscChainId,
  gnosis: gnosisChainId,
  monad: monadChainId,
  megaEth: megaethChainId,
  hyperEvm: hyperEvmChainId,
  plasma: plasmaChainId,
  katana: katanaChainId,
} as const

export const UTXO_CHAIN_IDS = {
  bitcoin: btcChainId,
  bitcoinCash: bchChainId,
  dogecoin: dogeChainId,
  litecoin: ltcChainId,
} as const

export const COSMOS_CHAIN_IDS = {
  cosmos: cosmosChainId,
  thorchain: thorchainChainId,
  mayachain: mayachainChainId,
} as const

export const OTHER_CHAIN_IDS = {
  solana: solanaChainId,
} as const

// Chains the web app / public API support in production but the widget cannot execute
// natively (no wallet adapter). These are displayed and routed to the ShapeShift app via
// allowShapeshiftRedirect. Cosmos SDK chains (COSMOS_CHAIN_IDS) are likewise redirect-only.
export const REDIRECT_ONLY_CHAIN_IDS = {
  zcash: zecChainId,
  tron: tronChainId,
  sui: suiChainId,
  ton: tonChainId,
  near: nearChainId,
  starknet: starknetChainId,
} as const

export const isEvmChainId = (chainId: string): boolean => {
  const { chainNamespace } = fromChainId(chainId as ChainId)
  return chainNamespace === CHAIN_NAMESPACE.Evm
}

export const getEvmNetworkId = (chainId: string): number => {
  const { chainReference } = fromChainId(chainId as ChainId)
  return parseInt(chainReference, 10)
}

export const getChainType = (chainId: string): 'evm' | 'utxo' | 'cosmos' | 'solana' | 'other' => {
  const { chainNamespace } = fromChainId(chainId as ChainId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return 'evm'
    case CHAIN_NAMESPACE.Utxo:
      return 'utxo'
    case CHAIN_NAMESPACE.CosmosSdk:
      return 'cosmos'
    case CHAIN_NAMESPACE.Solana:
      return 'solana'
    default:
      return 'other'
  }
}

// Capability gating: which chains the widget can execute natively, based on its actual
// wallet adapters (configured EVM chains via wagmi, Bitcoin, Solana) rather than chain
// namespace. Anything not natively supported is displayed (sourced from the web app asset
// CDN) and routed to the ShapeShift app via allowShapeshiftRedirect instead. This is why
// e.g. Zcash (bip122) or an unconfigured EVM chain are treated as non-native here.
const NATIVE_EVM_CHAIN_ID_SET: ReadonlySet<string> = new Set(Object.values(EVM_CHAIN_IDS))
const NATIVE_UTXO_CHAIN_ID_SET: ReadonlySet<string> = new Set(Object.values(UTXO_CHAIN_IDS))

export const isWidgetNativeEvmChainId = (chainId: string): boolean =>
  NATIVE_EVM_CHAIN_ID_SET.has(chainId)

export const isWidgetNativeUtxoChainId = (chainId: string): boolean =>
  NATIVE_UTXO_CHAIN_ID_SET.has(chainId)

export const isWidgetNativeSolanaChainId = (chainId: string): boolean =>
  chainId === OTHER_CHAIN_IDS.solana

export const isWidgetNativeChainId = (chainId: string): boolean =>
  isWidgetNativeEvmChainId(chainId) ||
  isWidgetNativeUtxoChainId(chainId) ||
  isWidgetNativeSolanaChainId(chainId)

// Full production allowlist the widget will display, composed from the chain groups above:
// natively-executable chains plus redirect-only chains. The asset CDN contains every chain
// regardless of production status, so display is gated on this set. Keep in sync with the
// public API's SUPPORTED_CHAIN_IDS (packages/public-api/src/constants.ts).
const SUPPORTED_CHAIN_ID_SET: ReadonlySet<string> = new Set([
  ...Object.values(EVM_CHAIN_IDS),
  ...Object.values(UTXO_CHAIN_IDS),
  ...Object.values(COSMOS_CHAIN_IDS),
  ...Object.values(OTHER_CHAIN_IDS),
  ...Object.values(REDIRECT_ONLY_CHAIN_IDS),
])

export const isWidgetSupportedChainId = (chainId: string): boolean =>
  SUPPORTED_CHAIN_ID_SET.has(chainId)

export const formatAmount = (amount: string, decimals: number, maxDecimals?: number): string => {
  const effectiveMaxDecimals = maxDecimals ?? Math.min(decimals, 8)
  const result = BigAmount.fromBaseUnit({ value: amount, precision: decimals }).toFixed(
    effectiveMaxDecimals,
  )
  const num = Number(result)
  if (num === 0) return '0'

  const threshold = Math.pow(10, -effectiveMaxDecimals)
  if (num > 0 && num < threshold) {
    return `< ${threshold.toFixed(effectiveMaxDecimals)}`
  }

  return num.toLocaleString(undefined, {
    maximumFractionDigits: effectiveMaxDecimals,
    minimumFractionDigits: 0,
  })
}

export const parseAmount = (amount: string, decimals: number): string => {
  return BigAmount.fromPrecision({ value: amount, precision: decimals }).toBaseUnit()
}

export const truncateAddress = (address: string, chars = 4): string => {
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export type TransactionStatusResult = {
  status: TransactionStatus
  confirmations?: number
  blockNumber?: number
  error?: string
}

export type BitcoinTransactionStatus = {
  confirmed: boolean
  block_height?: number
  block_hash?: string
  block_time?: number
}

export type WalletProviderNamespace = 'eip155' | 'bip122' | 'solana'

export type MultiChainAddress = {
  namespace: WalletProviderNamespace
  address: string
  chainId?: ChainId
}

export type MultiChainWalletState = {
  isConnected: boolean
  addresses: MultiChainAddress[]
  activeNamespace?: WalletProviderNamespace
}
