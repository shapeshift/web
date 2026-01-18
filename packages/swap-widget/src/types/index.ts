import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
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
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import { fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import type { WalletClient } from 'viem'
import { erc20Abi } from 'viem'

export type { AssetId, ChainId }
export type { BitcoinConnector }
export type { SolanaProvider }

export enum SwapperName {
  Thorchain = 'THORChain',
  Mayachain = 'MAYAChain',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  ArbitrumBridge = 'Arbitrum Bridge',
  Portals = 'Portals',
  Chainflip = 'Chainflip',
  Jupiter = 'Jupiter',
  Relay = 'Relay',
  ButterSwap = 'ButterSwap',
  Bebop = 'Bebop',
  NearIntents = 'NEAR Intents',
  Cetus = 'Cetus',
  Sunio = 'Sun.io',
  Avnu = 'AVNU',
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
}

export type SwapWidgetProps = {
  apiKey?: string
  apiBaseUrl?: string
  defaultSellAsset?: Asset
  defaultBuyAsset?: Asset
  disabledChainIds?: ChainId[]
  disabledAssetIds?: AssetId[]
  allowedChainIds?: ChainId[]
  allowedAssetIds?: AssetId[]
  allowedSwapperNames?: SwapperName[]
  walletClient?: WalletClient
  onConnectWallet?: () => void
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  onAssetSelect?: (type: 'sell' | 'buy', asset: Asset) => void
  theme?: ThemeMode | ThemeConfig
  defaultSlippage?: string
  showPoweredBy?: boolean
  enableWalletConnection?: boolean
  walletConnectProjectId?: string
  defaultReceiveAddress?: string
  ratesRefetchInterval?: number
}

export type RatesResponse = {
  rates: TradeRate[]
}

type TransactionData = {
  to: string
  data: string
  value?: string
  gasLimit?: string
  chainId?: number
  relayId?: string
}

type QuoteStep = {
  transactionData?: TransactionData
  relayTransactionMetadata?: TransactionData
  butterSwapTransactionMetadata?: TransactionData
}

export type QuoteResponse = {
  quote?: {
    steps?: QuoteStep[]
  }
  transactionData?: TransactionData
  steps?: QuoteStep[]
  approval?: {
    isRequired: boolean
    spender: string
  }
}

export { erc20Abi as ERC20_ABI }

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
  arbitrumNova: arbitrumNovaChainId,
  monad: monadChainId,
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

export const formatAmount = (amount: string, decimals: number, maxDecimals?: number): string => {
  const effectiveMaxDecimals = maxDecimals ?? Math.min(decimals, 8)
  const result = fromBaseUnit(amount, decimals, effectiveMaxDecimals)
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
  return toBaseUnit(amount, decimals)
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
